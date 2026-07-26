/**
 * R10 Analytics — Envio de alertas EV+ via WhatsApp (CallMeBot)
 * Mesmo sistema já funcionando no Apoio Universitário e Psicologia
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  const { numero, mensagem } = req.body
  // Formato CallMeBot: sem + e sem 9 extra para fixos (ex: 5538999936623)
  const CALLMEBOT_KEY = process.env.CALLMEBOT_KEY

  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${numero}&text=${encodeURIComponent(mensagem)}&apikey=${CALLMEBOT_KEY}`
    const r = await fetch(url)
    const text = await r.text()
    return res.status(200).json({ ok: true, response: text })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
