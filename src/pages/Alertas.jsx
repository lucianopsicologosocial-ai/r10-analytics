import React, { useState } from 'react'
import { PARTIDAS_MOCK, JOGADORES_MOCK } from '../lib/apiEsportes'
import { detectarValor, probGolJogador } from '../lib/modelos'

export default function Alertas({ session, irPara }) {
  const [canal, setCanal] = useState('push')
  const [limiteEV, setLimiteEV] = useState('5')
  const DEFAULT_ALERTAS = [
    { id: 1, tipo: 'EV+ partida', descricao: 'Qualquer EV+ acima de 5%', ativo: true },
    { id: 2, tipo: 'Gol provável', descricao: 'P(gol) > 70% + odds altas', ativo: true },
    { id: 3, tipo: 'Odds em queda', descricao: 'Odd cai >15% → sinal de mercado', ativo: false },
  ]
  const [alertasAtivos, setAlertasAtivos] = useState(() => {
    try {
      const saved = sessionStorage.getItem('r10_alertas')
      return saved ? JSON.parse(saved) : DEFAULT_ALERTAS
    } catch { return DEFAULT_ALERTAS }
  })

  useEffect(() => {
    try { sessionStorage.setItem('r10_alertas', JSON.stringify(alertasAtivos)) }
    catch {}
  }, [alertasAtivos])

  const toggleAlerta = id => setAlertasAtivos(prev => prev.map(a => a.id === id ? { ...a, ativo: !a.ativo } : a))

  // Gerar alertas baseados nos mocks
  const alertasGerados = PARTIDAS_MOCK.map(p => {
    const analise = detectarValor(0.55, p.odds.home)
    if (!analise.tem_valor) return null
    return { partida: p, analise, mercado: 'Casa', time: p.home }
  }).filter(Boolean)

  return (
    <div style={{ padding: '24px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => irPara('dashboard')} style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 8, padding: '8px 12px', color: 'var(--text2)', fontSize: 14 }}>←</button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Alertas EV+</h1>
          <p style={{ fontSize: 12, color: 'var(--text2)' }}>Notificações em tempo real</p>
        </div>
      </div>

      {/* Config de canal */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 14, padding: '16px', marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, letterSpacing: 1, marginBottom: 12 }}>CANAL DE NOTIFICAÇÃO</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[
            { id: 'push', icon: '📲', label: 'Push' },
            { id: 'whatsapp', icon: '💬', label: 'WhatsApp' },
            { id: 'ambos', icon: '🔔', label: 'Ambos' },
          ].map(c => (
            <button key={c.id} onClick={() => setCanal(c.id)} style={{
              flex: 1, padding: '10px 6px', borderRadius: 10, fontSize: 12, fontWeight: 500,
              background: canal === c.id ? 'var(--ouro)' : 'var(--bg3)',
              color: canal === c.id ? '#fff' : 'var(--text2)',
              border: canal === c.id ? 'none' : '1px solid var(--borda)', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
            }}>
              <span style={{ fontSize: 18 }}>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>EV mínimo para alertar: {limiteEV}%</label>
          <input type="range" min="1" max="20" value={limiteEV} onChange={e => setLimiteEV(e.target.value)}
            style={{ width: '100%' }} />
        </div>
      </div>

      {/* Alertas ativos */}
      <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', letterSpacing: 0.3, marginBottom: 12 }}>TIPOS DE ALERTA</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {alertasAtivos.map(a => (
          <div key={a.id} style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{a.tipo}</p>
              <p style={{ fontSize: 11, color: 'var(--text2)' }}>{a.descricao}</p>
            </div>
            <button onClick={() => toggleAlerta(a.id)} style={{
              width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: a.ativo ? 'var(--verde-ev)' : 'var(--bg3)', position: 'relative', transition: 'all .2s'
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3, left: a.ativo ? 23 : 3, transition: 'left .2s'
              }} />
            </button>
          </div>
        ))}
      </div>

      {/* Alertas recentes */}
      <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', letterSpacing: 0.3, marginBottom: 12 }}>ALERTAS RECENTES</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alertasGerados.length > 0 ? alertasGerados.map((a, i) => (
          <button key={i} onClick={() => irPara('calculadora', { partida: a.partida, prob: 0.55, odds: a.partida.odds.home })} style={{
            background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: 12,
            padding: '14px 16px', textAlign: 'left', width: '100%', cursor: 'pointer'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.partida.home} vs {a.partida.away}</p>
              <span className="ev-badge-pos">{a.analise.classificacao}</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text2)' }}>{a.partida.liga} • {a.mercado}: {a.time} @ {a.partida.odds.home}</p>
            <p style={{ fontSize: 11, color: 'var(--verde-ev)', marginTop: 4 }}>EV: {a.analise.ev} | Vantagem: {a.analise.vantagem}</p>
          </button>
        )) : (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text2)' }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>🔔</p>
            <p>Nenhum alerta EV+ no momento</p>
          </div>
        )}
      </div>
    </div>
  )
}
