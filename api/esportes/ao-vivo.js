/**
 * R10 Analytics — Proxy ao vivo
 * GET /api/esportes/ao-vivo
 * Retorna partidas em andamento agora via API-Football
 */

const API_KEY = process.env.API_FOOTBALL_KEY
const BASE = 'https://v3.football.api-sports.io'

export default async function handler(req, res) {
  if (!API_KEY) {
    return res.status(500).json({ errors: { token: 'API_FOOTBALL_KEY não configurada no servidor' } })
  }

  try {
    const url = `${BASE}/fixtures?live=all`
    const apiresp = await fetch(url, {
      headers: { 'x-apisports-key': API_KEY }
    })
    const data = await apiresp.json()
    return res.status(200).json(data)
  } catch (err) {
    console.error('Erro ao-vivo:', err)
    return res.status(500).json({ errors: { server: err.message } })
  }
}
