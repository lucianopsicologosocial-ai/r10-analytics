// Odds não disponíveis no plano free do football-data.org
// Retorna estrutura vazia com mensagem clara
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  return res.status(200).json({
    response: [],
    results: 0,
    errors: {},
    message: 'Odds em tempo real requerem plano pago. Use a calculadora manual.'
  })
}
