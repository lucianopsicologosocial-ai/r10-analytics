// Odds reais via The Odds API (the-odds-api.com)
// Free tier: 500 req/mês | Inclui Betfair Exchange + 40 casas
// Variável Vercel: ODDS_API_KEY

const ODDS_KEY = process.env.ODDS_API_KEY
const BASE = 'https://api.the-odds-api.com/v4'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { casa, fora, liga } = req.query

  if (!ODDS_KEY) {
    return res.status(200).json({ fonte: 'estimada', aviso: 'ODDS_API_KEY não configurada', odds: fallback() })
  }

  try {
    // Buscar jogos ao vivo + próximos do futebol
    const sport = 'soccer'
    const r = await fetch(
      `${BASE}/sports/${sport}/odds/?apiKey=${ODDS_KEY}&regions=eu&markets=h2h&bookmakers=betfair_ex,pinnacle&dateFormat=iso`,
    )

    if (!r.ok) {
      const txt = await r.text()
      return res.status(200).json({ fonte: 'estimada', aviso: `API error ${r.status}: ${txt.slice(0,100)}`, odds: fallback() })
    }

    const data = await r.json()
    // Headers de uso restante
    const restantes = r.headers.get('x-requests-remaining')
    const usados = r.headers.get('x-requests-used')

    // Filtrar pelo jogo solicitado (se passado)
    let jogos = data || []
    if (casa && fora) {
      const homeLower = casa.toLowerCase()
      const awayLower = fora.toLowerCase()
      const match = jogos.find(j =>
        j.home_team?.toLowerCase().includes(homeLower) ||
        j.away_team?.toLowerCase().includes(awayLower)
      )
      if (match) jogos = [match]
    }

    // Formatar resposta
    const resultado = jogos.slice(0, 10).map(j => {
      const betfair = j.bookmakers?.find(b => b.key === 'betfair_ex')
      const pinnacle = j.bookmakers?.find(b => b.key === 'pinnacle')
      const mercado = betfair?.markets?.find(m => m.key === 'h2h') || pinnacle?.markets?.find(m => m.key === 'h2h')
      const outcomes = mercado?.outcomes || []
      const home = outcomes.find(o => o.name === j.home_team)?.price || 0
      const away = outcomes.find(o => o.name === j.away_team)?.price || 0
      const draw = outcomes.find(o => o.name === 'Draw')?.price || 0
      const margem = home && draw && away
        ? ((1/home + 1/draw + 1/away - 1) * 100).toFixed(2) : null

      return {
        id: j.id,
        home: j.home_team,
        away: j.away_team,
        liga: j.sport_title,
        data: j.commence_time,
        fonte: betfair ? 'Betfair Exchange' : pinnacle ? 'Pinnacle' : 'N/D',
        odds: { home, draw, away },
        margem_vig: margem ? `${margem}%` : null,
        prob_implicita: {
          home: home ? ((1/home)*100).toFixed(1)+'%' : null,
          draw: draw ? ((1/draw)*100).toFixed(1)+'%' : null,
          away: away ? ((1/away)*100).toFixed(1)+'%' : null,
        }
      }
    })

    return res.status(200).json({
      fonte: 'the-odds-api',
      jogos: resultado,
      total: resultado.length,
      uso_api: { restantes, usados },
    })

  } catch (e) {
    console.error('Odds error:', e)
    return res.status(200).json({ fonte: 'estimada', aviso: e.message, odds: fallback() })
  }
}

function fallback() {
  return { home: 2.10, draw: 3.40, away: 3.20, nota: 'Insira as odds reais na calculadora' }
}
