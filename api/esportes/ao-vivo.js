const API_KEY = process.env.API_FOOTBALL_KEY
const BASE = 'https://v3.football.api-sports.io'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (!API_KEY) {
    return res.status(500).json({ errors: { token: 'API_FOOTBALL_KEY nao configurada' } })
  }

  try {
    const url = `${BASE}/fixtures?live=all`
    const apiresp = await fetch(url, {
      headers: {
        'x-apisports-key': API_KEY,
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'Authorization': API_KEY
      }
    })

    if (!apiresp.ok) {
      const text = await apiresp.text()
      return res.status(apiresp.status).json({ errors: { api: text } })
    }

    const data = await apiresp.json()
    return res.status(200).json(data)
  } catch (err) {
    console.error('Erro ao-vivo:', err)
    return res.status(500).json({ errors: { server: err.message } })
  }
}
