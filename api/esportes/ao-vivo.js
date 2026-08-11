const API_KEY = process.env.FOOTBALL_DATA_KEY
const BASE = 'https://api.football-data.org/v4'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (!API_KEY) {
    return res.status(500).json({ errors: { token: 'FOOTBALL_DATA_KEY nao configurada' } })
  }

  try {
    // Buscar partidas ao vivo (status=LIVE ou IN_PLAY ou PAUSED)
    const r = await fetch(`${BASE}/matches?status=IN_PLAY,PAUSED,LIVE`, {
      headers: { 'X-Auth-Token': API_KEY }
    })

    if (!r.ok) {
      const text = await r.text()
      return res.status(r.status).json({ errors: { api: text } })
    }

    const data = await r.json()

    // Converter formato football-data.org → formato esperado pelo frontend
    const response = (data.matches || []).map(m => ({
      fixture: {
        id: m.id,
        status: {
          elapsed: m.minute || null,
          short: m.status === 'IN_PLAY' ? 'LIVE' : m.status
        }
      },
      league: {
        name: m.competition?.name || '',
        logo: m.competition?.emblem || ''
      },
      teams: {
        home: { name: m.homeTeam?.name || '', logo: m.homeTeam?.crest || '' },
        away: { name: m.awayTeam?.name || '', logo: m.awayTeam?.crest || '' }
      },
      goals: {
        home: m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? 0,
        away: m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? 0
      }
    }))

    return res.status(200).json({ response, results: response.length, errors: {} })
  } catch (err) {
    console.error('Erro ao-vivo:', err)
    return res.status(500).json({ errors: { server: err.message } })
  }
}
