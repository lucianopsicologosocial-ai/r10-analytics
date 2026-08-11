// TheSportsDB para stats de jogador (gratuito)
const TSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/3'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { id } = req.query
  if (!id) return res.status(400).json({ errors: { param: 'id obrigatorio' } })

  try {
    const r = await fetch(`${TSDB_BASE}/lookupplayer.php?id=${id}`)
    const data = await r.json()
    return res.status(200).json({ response: data.players || [], results: (data.players||[]).length, errors: {} })
  } catch(e) {
    return res.status(500).json({ errors: { server: e.message } })
  }
}
