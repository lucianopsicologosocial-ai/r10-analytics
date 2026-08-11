// football-data.org não tem API de jogadores no plano free
// Usando TheSportsDB (gratuito e sem limite)
const TSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/3'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { nome } = req.query
  if (!nome) return res.status(400).json({ errors: { param: 'nome obrigatorio' } })

  try {
    const r = await fetch(`${TSDB_BASE}/searchplayers.php?p=${encodeURIComponent(nome)}`)
    const data = await r.json()
    const players = (data.player || []).map(p => ({
      player: {
        id: p.idPlayer,
        name: p.strPlayer,
        photo: p.strThumb || p.strCutout
      },
      statistics: [{
        team: { name: p.strTeam },
        games: { position: p.strPosition }
      }]
    }))
    return res.status(200).json({ response: players, results: players.length, errors: {} })
  } catch(e) {
    return res.status(500).json({ errors: { server: e.message } })
  }
}
