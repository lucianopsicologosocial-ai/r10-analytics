const API_KEY = process.env.FOOTBALL_DATA_KEY
const BASE = 'https://api.football-data.org/v4'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (!API_KEY) return res.status(500).json({ errors: { token: 'FOOTBALL_DATA_KEY nao configurada' } })

  const { time, tipo = 'proximas', n = '5' } = req.query
  if (!time) return res.status(400).json({ errors: { param: 'time obrigatorio' } })

  try {
    // football-data.org: buscar próximos ou últimos jogos do time
    const status = tipo === 'proximas' ? 'SCHEDULED,TIMED' : 'FINISHED'
    const r = await fetch(`${BASE}/teams/${time}/matches?status=${status}&limit=${n}`, {
      headers: { 'X-Auth-Token': API_KEY }
    })
    const data = await r.json()

    // Converter para formato compatível com frontend
    const response = (data.matches || []).map(m => ({
      fixture: { id: m.id, date: m.utcDate, status: { short: m.status } },
      league: { name: m.competition?.name || '', logo: m.competition?.emblem || '' },
      teams: {
        home: { name: m.homeTeam?.name || '', logo: m.homeTeam?.crest || '' },
        away: { name: m.awayTeam?.name || '', logo: m.awayTeam?.crest || '' }
      },
      goals: { home: m.score?.fullTime?.home ?? 0, away: m.score?.fullTime?.away ?? 0 }
    }))

    return res.status(200).json({ response, results: response.length, errors: {} })
  } catch(e) {
    return res.status(500).json({ errors: { server: e.message } })
  }
}
