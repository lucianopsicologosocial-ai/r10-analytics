import React, { useState } from 'react'

const PLANOS = [
  { id: 'basico', nome: 'Básico', preco: 'R$39,90', icon: '📊', destaque: false,
    itens: ['✅ 10 análises de jogadores/dia','✅ Calculadora EV + Kelly','✅ Remoção de vig','✅ Histórico de apostas','✅ Gestão de banca'] },
  { id: 'premium', nome: 'Premium', preco: 'R$89,90', icon: '🔥', destaque: true,
    itens: ['✅ Tudo do Básico','✅ Alertas EV+ em tempo real','✅ Painel ao vivo com odds','✅ WhatsApp + Push simultâneos','✅ Plano de recuperação avançado','✅ Ilimitado análises de jogadores','✅ API-Football com histórico'] }
]

export default function Assinatura({ session, irPara }) {
  const [plano, setPlano] = useState('premium')
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [etapa, setEtapa] = useState('planos')
  const [load, setLoad] = useState(false)

  const pagar = async () => {
    setLoad(true)
    try {
      const controller = new AbortController()
      const tid = setTimeout(() => controller.abort(), 30000)
      const res = await fetch('/api/criar-assinatura', { signal: controller.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano, userId: session.user.id, email: session.user.email, nome, cpf })
      })
      const data = await res.json()
      clearTimeout(tid)
      if (data.paymentLink) { window.open(data.paymentLink, '_blank') } else { alert('Erro: ' + (data.error || JSON.stringify(data))) }
    } catch (err) { alert('Erro: ' + err.message) }
    finally { setLoad(false) }
  }

  return (
    <div style={{ padding: '24px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => irPara('dashboard')} style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 8, padding: '8px 12px', color: 'var(--text2)', fontSize: 14 }}>←</button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Planos Premium</h1>
          <p style={{ fontSize: 12, color: 'var(--text2)' }}>Alertas EV+ + painel ao vivo</p>
        </div>
      </div>

      {etapa === 'planos' && (
        <>
          {PLANOS.map(p => (
            <div key={p.id} onClick={() => setPlano(p.id)} style={{
              background: 'var(--bg2)', border: `2px solid ${plano === p.id ? 'var(--ouro-brilho)' : 'var(--borda)'}`,
              borderRadius: 14, padding: '18px', marginBottom: 14, cursor: 'pointer', position: 'relative'
            }}>
              {p.destaque && <div style={{ position: 'absolute', top: -10, left: 16, background: 'var(--ouro)', color: '#fff', fontSize: 10, padding: '3px 10px', borderRadius: 10, fontWeight: 600 }}>RECOMENDADO</div>}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 28 }}>{p.icon}</span>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{p.nome}</p>
                    <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--ouro-brilho)' }}>{p.preco}<span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 400 }}>/mês</span></p>
                  </div>
                </div>
                <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${plano === p.id ? 'var(--ouro-brilho)' : 'var(--borda)'}`, background: plano === p.id ? 'var(--ouro)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {plano === p.id && <span style={{ fontSize: 12, color: '#fff' }}>✓</span>}
                </div>
              </div>
              {p.itens.map((item, i) => <p key={i} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 5 }}>{item}</p>)}
            </div>
          ))}
          <button className="btn-ouro" onClick={() => setEtapa('dados')} style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, marginTop: 8 }}>
            💛 Continuar para pagamento
          </button>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text2)', marginTop: 16 }}>🔒 Pagamento seguro via Asaas • PIX, boleto ou cartão</p>
        </>
      )}

      {etapa === 'dados' && (
        <div>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo"
            style={{ width: '100%', padding: '13px 16px', background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 10, color: 'var(--text)', fontSize: 14, marginBottom: 12 }} />
          <input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="CPF (000.000.000-00)"
            style={{ width: '100%', padding: '13px 16px', background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 10, color: 'var(--text)', fontSize: 14, marginBottom: 16 }} />
          <button className="btn-ouro" onClick={pagar} disabled={!nome || !cpf || load} style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, opacity: (!nome || !cpf || load) ? 0.6 : 1 }}>
            {load ? 'Gerando link...' : '💳 Ir para o pagamento'}
          </button>
          <button onClick={() => setEtapa('planos')} style={{ width: '100%', background: 'none', border: 'none', color: 'var(--text2)', fontSize: 13, marginTop: 12, cursor: 'pointer', padding: '10px' }}>← Voltar</button>
        </div>
      )}
    </div>
  )
}
