const API_KEY = process.env.API_FOOTBALL_KEY
const BASE = 'https://v3.football.api-sports.io'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (!API_KEY) return res.status(500).json({ errors: { token: 'API_FOOTBALL_KEY nao configurada' } })
  const { nome } = req.query
  if (!nome) return res.status(400).json({ errors: { param: 'nome obrigatorio' } })
  try {
    const r = await fetch(`${BASE}/players?search=${encodeURIComponent(nome)}&season=2024`, {
      headers: { 'x-apisports-key': API_KEY, 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' }
    })
    return res.status(200).json(await r.json())
  } catch(e) { return res.status(500).json({ errors: { server: e.message } }) }
}
