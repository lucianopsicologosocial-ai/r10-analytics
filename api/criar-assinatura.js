export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })
  const { plano, userId, email, nome, cpf } = req.body
  const ASAAS_KEY = process.env.ASAAS_API_KEY
  const ASAAS_URL = 'https://api.asaas.com/v3'

  try {
    // Busca ou cria cliente
    const busca = await fetch(`${ASAAS_URL}/customers?email=${email}`, { headers: { 'access_token': ASAAS_KEY } })
    const clienteData = await busca.json()
    let clienteId
    if (clienteData.data?.length > 0) {
      clienteId = clienteData.data[0].id
    } else {
      const nc = await fetch(`${ASAAS_URL}/customers`, { method: 'POST', headers: { 'access_token': ASAAS_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: nome, email, cpfCnpj: cpf.replace(/\D/g, '') }) })
      clienteId = (await nc.json()).id
    }

    const valor = plano === 'premium' ? 89.90 : 39.90
    const descricao = `R10 Analytics — ${plano === 'premium' ? 'Premium (Alertas + Ao Vivo)' : 'Básico'}`

    const sub = await fetch(`${ASAAS_URL}/subscriptions`, { method: 'POST', headers: { 'access_token': ASAAS_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ customer: clienteId, billingType: 'UNDEFINED', value: valor, nextDueDate: new Date().toISOString().split('T')[0], cycle: 'MONTHLY', description: descricao, externalReference: `${userId}|${plano}` }) })
    const subData = await sub.json()

    const cobranca = await fetch(`${ASAAS_URL}/subscriptions/${subData.id}/payments`, { headers: { 'access_token': ASAAS_KEY } })
    const cobrancaData = await cobranca.json()
    const paymentLink = cobrancaData.data?.[0]?.invoiceUrl || subData.url

    return res.status(200).json({ ok: true, paymentLink, subscriptionId: subData.id })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
