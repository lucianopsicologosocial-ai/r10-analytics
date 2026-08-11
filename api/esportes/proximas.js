// Próximas partidas das principais ligas via football-data.org
const API_KEY = process.env.FOOTBALL_DATA_KEY
const BASE = 'https://api.football-data.org/v4'

// Ligas disponíveis no plano free: PL(39), BL1(78), SA(135), PD(140), FL1(61), CL(2), BSA(71)
const LIGAS_FREE = [2, 39, 71, 78, 135, 140, 61]

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (!API_KEY) return res.status(500).json({ errors: { token: 'FOOTBALL_DATA_KEY nao configurada' } })

  try {
    // Pegar próximas partidas de todas as ligas (1 req por liga — usar a principal)
    const r = await fetch(`${BASE}/matches?status=SCHEDULED,TIMED&limit=10`, {
      headers: { 'X-Auth-Token': API_KEY }
    })

    if (!r.ok) {
      const text = await r.text()
      return res.status(r.status).json({ errors: { api: text } })
    }

    const data = await r.json()
    const response = (data.matches || []).slice(0, 8).map(m => ({
      id: String(m.id),
      home: m.homeTeam?.shortName || m.homeTeam?.name || '',
      away: m.awayTeam?.shortName || m.awayTeam?.name || '',
      data: m.utcDate,
      liga: m.competition?.name || '',
      status: 'agendada',
      odds: { home: 0, draw: 0, away: 0 } // odds não disponíveis no free
    }))

    return res.status(200).json({ response, results: response.length, errors: {} })
  } catch(e) {
    return res.status(500).json({ errors: { server: e.message } })
  }
}
