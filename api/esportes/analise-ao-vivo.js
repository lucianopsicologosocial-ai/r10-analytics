// Motor de IA ao vivo — Claude API + Modelo matemático
// Combina: Poisson ao vivo + xG por jogador + Movimento de mercado
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
const FOOTBALL_KEY = process.env.FOOTBALL_DATA_KEY
const ODDS_KEY = process.env.ODDS_API_KEY
const BASE_FD = 'https://api.football-data.org/v4'
const BASE_ODDS = 'https://api.the-odds-api.com/v4'

// ─── Modelo matemático: Poisson ao vivo ───────────────────────────
function poissonProb(lambda, k) {
  let p = Math.exp(-lambda)
  for (let i = 1; i <= k; i++) p *= lambda / i
  return p
}

function calcPoissonAoVivo(golsCasa, golsFora, minuto, lambdaCasa = 1.4, lambdaFora = 1.1) {
  const minRestante = Math.max(90 - minuto, 1)
  const fator = minRestante / 90
  // Lambda restante proporcional ao tempo
  const lCasa = lambdaCasa * fator
  const lFora = lambdaFora * fator
  // Calcular prob de cada resultado possível nos gols restantes
  let pCasa = 0, pEmpate = 0, pFora = 0
  for (let gc = 0; gc <= 6; gc++) {
    for (let gf = 0; gf <= 6; gf++) {
      const p = poissonProb(lCasa, gc) * poissonProb(lFora, gf)
      const totalCasa = golsCasa + gc
      const totalFora = golsFora + gf
      if (totalCasa > totalFora) pCasa += p
      else if (totalCasa === totalFora) pEmpate += p
      else pFora += p
    }
  }
  const total = pCasa + pEmpate + pFora
  return {
    home: (pCasa / total * 100).toFixed(1),
    draw: (pEmpate / total * 100).toFixed(1),
    away: (pFora / total * 100).toFixed(1)
  }
}

// ─── Modelo de jogador: xG simplificado por posição/momento ───────
function calcInfluenciaJogadores(stats) {
  // Usa chutes a gol como proxy de xG (sem dados granulares no plano free)
  const chutesCasa = stats?.home?.shots_on_goal || 0
  const chutesFora = stats?.away?.shots_on_goal || 0
  const posseCasa = stats?.home?.ball_possession || 50
  const xgCasa = chutesCasa * 0.11 + (posseCasa - 50) * 0.02
  const xgFora = chutesFora * 0.11 + (50 - posseCasa) * 0.02
  return { xgCasa: Math.max(0, xgCasa).toFixed(2), xgFora: Math.max(0, xgFora).toFixed(2) }
}

// ─── Movimento de mercado: extrai sinal das odds ao vivo ──────────
function calcSinalMercado(oddsAtuais, oddsIniciais) {
  if (!oddsAtuais || !oddsIniciais) return null
  const movCasa = (1/oddsAtuais.home - 1/oddsIniciais.home) * 100
  const movFora = (1/oddsAtuais.away - 1/oddsIniciais.away) * 100
  return { movCasa: movCasa.toFixed(2), movFora: movFora.toFixed(2), sinal: movCasa > 2 ? 'casa' : movFora > 2 ? 'fora' : 'neutro' }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { matchId, home, away, minuto, golsCasa, golsFora, liga } = req.query

  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ erro: 'ANTHROPIC_API_KEY não configurada' })
  }

  try {
    const min = parseInt(minuto) || 45
    const gC = parseInt(golsCasa) || 0
    const gF = parseInt(golsFora) || 0

    // 1. Modelo Poisson ao vivo
    const poisson = calcPoissonAoVivo(gC, gF, min)

    // 2. Buscar stats do jogo se tiver matchId
    let stats = null
    let statsTexto = 'Dados de chutes/posse não disponíveis neste momento.'
    if (matchId && FOOTBALL_KEY) {
      try {
        const r = await fetch(`${BASE_FD}/matches/${matchId}`, {
          headers: { 'X-Auth-Token': FOOTBALL_KEY }
        })
        if (r.ok) {
          const d = await r.json()
          stats = {
            home: { shots_on_goal: d.homeTeam?.statistics?.shotsOnGoal || 0, ball_possession: d.homeTeam?.statistics?.ballPossession || 50 },
            away: { shots_on_goal: d.awayTeam?.statistics?.shotsOnGoal || 0, ball_possession: d.awayTeam?.statistics?.ballPossession || 50 }
          }
          statsTexto = `${home}: ${stats.home.shots_on_goal} chutes a gol, ${stats.home.ball_possession}% posse. ${away}: ${stats.away.shots_on_goal} chutes a gol, ${stats.away.ball_possession}% posse.`
        }
      } catch {}
    }

    // 3. xG por jogador (proxy via chutes)
    const xg = calcInfluenciaJogadores(stats)

    // 4. Odds ao vivo do mercado
    let oddsTexto = 'Odds de mercado não disponíveis.'
    let oddsAtuais = null
    if (ODDS_KEY) {
      try {
        const r = await fetch(`${BASE_ODDS}/sports/soccer/odds/?apiKey=${ODDS_KEY}&regions=eu&markets=h2h&bookmakers=pinnacle&dateFormat=iso`)
        if (r.ok) {
          const d = await r.json()
          const jogo = d.find(j =>
            j.home_team?.toLowerCase().includes((home||'').toLowerCase().slice(0,5)) ||
            j.away_team?.toLowerCase().includes((away||'').toLowerCase().slice(0,5))
          )
          if (jogo) {
            const bm = jogo.bookmakers?.[0]?.markets?.[0]?.outcomes
            if (bm) {
              const hO = bm.find(o => o.name === jogo.home_team)?.price
              const aO = bm.find(o => o.name === jogo.away_team)?.price
              const dO = bm.find(o => o.name === 'Draw')?.price
              if (hO && dO && aO) {
                oddsAtuais = { home: hO, draw: dO, away: aO }
                oddsTexto = `Pinnacle ao vivo: ${home} ${hO.toFixed(2)} | Empate ${dO.toFixed(2)} | ${away} ${aO.toFixed(2)}`
              }
            }
          }
        }
      } catch {}
    }

    // 5. Claude API — análise narrativa + probabilidade final ponderada
    const prompt = `Você é um analista de futebol quantitativo. Analise este jogo ao vivo e gere uma probabilidade final ponderada.

JOGO: ${home} vs ${away}
LIGA: ${liga || 'Não informada'}
MINUTO: ${min}'
PLACAR: ${home} ${gC} x ${gF} ${away}

MODELO POISSON (baseado no placar e tempo restante):
- ${home} ganhar: ${poisson.home}%
- Empate: ${poisson.draw}%
- ${away} ganhar: ${poisson.away}%

MODELO DE JOGADOR (xG estimado via chutes):
- xG ${home}: ${xg.xgCasa} gols esperados
- xG ${away}: ${xg.xgFora} gols esperados
- ${statsTexto}

MERCADO (Pinnacle/Betfair Exchange ao vivo):
- ${oddsTexto}

INSTRUÇÕES:
1. Combine os três modelos com os seguintes pesos: Poisson 50%, xG 30%, Mercado 20%
2. Identifique o time com mais momentum no momento
3. Destaque 1 insight tático importante
4. Calcule a probabilidade final ponderada
5. Identifique se há EV+ comparando com odds de mercado (se disponíveis)

Responda APENAS em JSON válido, sem markdown, neste formato exato:
{
  "prob_final": {"home": NUMBER, "draw": NUMBER, "away": NUMBER},
  "momentum": "home|draw|away",
  "momentum_motivo": "string curta",
  "insight_tatico": "string 1-2 frases",
  "ev_alert": {"existe": boolean, "mercado": "string", "ev_percent": NUMBER_ou_null, "recomendacao": "string"},
  "confianca": "alta|media|baixa",
  "resumo": "string 1 frase"
}`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const claudeData = await claudeRes.json()
    const texto = claudeData.content?.[0]?.text || '{}'
    let analise
    try { analise = JSON.parse(texto) }
    catch { analise = { erro: 'Falha ao parsear resposta da IA', raw: texto.slice(0, 200) } }

    return res.status(200).json({
      jogo: { home, away, minuto: min, placar: [gC, gF], liga },
      modelos: { poisson, xg, odds: oddsAtuais },
      analise,
      gerado_em: new Date().toISOString()
    })

  } catch (err) {
    console.error('Analise ao vivo erro:', err)
    return res.status(500).json({ erro: err.message })
  }
}
