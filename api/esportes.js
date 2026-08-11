// Proxy principal — redireciona para subrotas específicas
// football-data.org (plano free, 10 req/min, sem suspensão por IP)
export default async function handler(req, res) {
  return res.status(404).json({ error: 'Use as rotas específicas: /api/esportes/ao-vivo, /api/esportes/partidas, etc.' })
}
