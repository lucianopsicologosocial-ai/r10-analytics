// Odds reais via OddsPapi — agrega Betfair Exchange + 350 casas
// Plano free: 500 req/mês | Signup: oddspapi.io (sem cartão)
// Variável Vercel: ODDSPAPI_KEY

const ODDSPAPI_KEY = process.env.ODDSPAPI_KEY
const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY
const BASE_ODDS = 'https://api.oddspapi.io/v4'
const BASE_FD = 'https://api.football-data.org/v4'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { matchId, casa, fora, liga } = req.query

  // Sem chave OddsPapi → retornar odds estimadas pelo Betfair usando market implied probability
  if (!ODDSPAPI_KEY) {
    return res.status(200).json({
      fonte: 'estimada',
      aviso: 'Configure ODDSPAPI_KEY no Vercel para odds reais do Betfair Exchange',
      odds: gerarOddsEstimadas(casa, fora),
      margem: null
    })
  }

  try {
    // 1. Buscar o fixture ID no OddsPapi pelo nome dos times
    const searchRes = await fetch(
      `${BASE_ODDS}/fixtures?homeTeam=${encodeURIComponent(casa || '')}&awayTeam=${encodeURIComponent(fora || '')}&apiKey=${ODDSPAPI_KEY}&sport=football`,
      { headers: { 'Accept': 'application/json' } }
    )
    const searchData = await searchRes.json()
    const fixture = searchData?.data?.[0]

    if (!fixture) {
      return res.status(200).json({
        fonte: 'estimada',
        aviso: 'Partida não encontrada no OddsPapi',
        odds: gerarOddsEstimadas(casa, fora),
        margem: null
      })
    }

    // 2. Buscar odds do Betfair Exchange para essa fixture
    const oddsRes = await fetch(
      `${BASE_ODDS}/odds?apiKey=${ODDSPAPI_KEY}&fixtureId=${fixture.id}&bookmakers=betfair-ex&market=h2h`,
      { headers: { 'Accept': 'application/json' } }
    )
    const oddsData = await oddsRes.json()
    const betfair = oddsData?.data?.bookmakers?.find(b => b.key === 'betfair-ex')
    const mercado = betfair?.markets?.find(m => m.key === 'h2h')
    const outcomes = mercado?.outcomes || []

    if (!outcomes.length) {
      return res.status(200).json({
        fonte: 'estimada',
        aviso: 'Betfair Exchange sem odds para esta partida ainda',
        odds: gerarOddsEstimadas(casa, fora),
        margem: null
      })
    }

    // 3. Calcular margem (vig) do Betfair
    const home = parseFloat(outcomes.find(o => o.name === 'Home')?.price || 0)
    const draw = parseFloat(outcomes.find(o => o.name === 'Draw')?.price || 0)
    const away = parseFloat(outcomes.find(o => o.name === 'Away')?.price || 0)
    const margem = home && draw && away
      ? (((1/home) + (1/draw) + (1/away) - 1) * 100).toFixed(2)
      : null

    return res.status(200).json({
      fonte: 'betfair_exchange',
      fixture: { id: fixture.id, home: fixture.homeTeam, away: fixture.awayTeam, date: fixture.date },
      odds: { home, draw, away },
      margem_vig: margem ? `${margem}%` : null,
      prob_implicita: {
        home: home ? ((1/home)*100).toFixed(1)+'%' : null,
        draw: draw ? ((1/draw)*100).toFixed(1)+'%' : null,
        away: away ? ((1/away)*100).toFixed(1)+'%' : null,
      },
      atualizado_em: new Date().toISOString()
    })

  } catch (e) {
    console.error('Odds error:', e)
    return res.status(200).json({
      fonte: 'estimada',
      aviso: 'Erro ao buscar odds: ' + e.message,
      odds: gerarOddsEstimadas(casa, fora),
      margem: null
    })
  }
}

// Fallback: odds simétricas quando API não disponível
function gerarOddsEstimadas(casa, fora) {
  return {
    home: 2.10,
    draw: 3.40,
    away: 3.20,
    nota: 'Odds de exemplo — insira as odds reais na calculadora para análise de EV'
  }
}
