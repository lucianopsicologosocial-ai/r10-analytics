/**
 * R10 Analytics — Proxy para API-Football
 * Roda no servidor Vercel para não expor a API key no frontend.
 * API-Football: https://api-football.com (v3)
 * Plano gratuito: 100 requisições/dia
 */

const API_KEY = process.env.API_FOOTBALL_KEY
const BASE = 'https://v3.football.api-sports.io'

const apiFetch = async (endpoint, params = {}) => {
  const url = new URL(BASE + endpoint)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: { 'x-apisports-key': API_KEY }
  })
  return res.json()
}

export default async function handler(req, res) {
  const { nome, id, temporada, time, tipo, n, partida } = req.query
  const path = req.url.split('?')[0].replace('/api/esportes', '')

  try {
    let data

    if (path === '/jogador') {
      data = await apiFetch('/players', { search: nome, league: 71, season: temporada || 2024 })
    } else if (path === '/stats') {
      data = await apiFetch('/players', { id, league: 71, season: temporada || 2024 })
    } else if (path === '/forma') {
      data = await apiFetch('/players', { id, league: 71, season: temporada || 2024 })
      // Retornar apenas os últimos n jogos
    } else if (path === '/partidas') {
      data = await apiFetch('/fixtures', {
        team: time,
        next: tipo === 'proximas' ? n || 5 : undefined,
        last: tipo === 'ultimas' ? n || 5 : undefined
      })
    } else if (path === '/ao-vivo') {
      data = await apiFetch('/fixtures', { live: 'all' })
    } else if (path === '/ao-vivo/stats') {
      data = await apiFetch('/fixtures/statistics', { fixture: partida })
    } else if (path === '/odds') {
      data = await apiFetch('/odds', { fixture: partida })
    } else {
      return res.status(404).json({ error: 'Endpoint não encontrado' })
    }

    return res.status(200).json(data)
  } catch (err) {
    console.error('API Esportes error:', err)
    return res.status(500).json({ error: err.message })
  }
}

// Rate limiting simples: máx 90 req/dia (deixa margem de segurança)
const contador = { data: new Date().toDateString(), count: 0 }
const checkRateLimit = () => {
  const hoje = new Date().toDateString()
  if (contador.data !== hoje) { contador.data = hoje; contador.count = 0 }
  if (contador.count >= 90) throw new Error('Limite diário de 90 requisições atingido. Tente amanhã.')
  contador.count++
}
