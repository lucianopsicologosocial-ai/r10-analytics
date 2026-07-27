import React from 'react'

const NAV = [
  { id: 'dashboard',   icon: '📊', label: 'Painel' },
  { id: 'ao-vivo',     icon: '🔴', label: 'Ao vivo' },
  { id: 'calculadora', icon: '🧮', label: 'Calcular' },
  { id: 'alertas',     icon: '🔔', label: 'Alertas' },
  { id: 'assinatura',  icon: '💳', label: 'Planos' },
]

export default function NavBar({ pagina, irPara }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'var(--bg2)', borderTop: '1px solid var(--borda)',
      display: 'flex', zIndex: 100,
      paddingBottom: 'env(safe-area-inset-bottom)'
    }}>
      {NAV.map(item => {
        const ativo = pagina === item.id
        return (
          <button key={item.id} onClick={() => irPara(item.id)} style={{
            flex: 1, padding: '10px 4px 8px',
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3
          }}>
            <span style={{ fontSize: 20, opacity: ativo ? 1 : 0.5 }}>{item.icon}</span>
            <span style={{ fontSize: 10, color: ativo ? 'var(--ouro-brilho)' : 'var(--text2)', fontWeight: ativo ? 600 : 400 }}>
              {item.label}
            </span>
            {ativo && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--ouro-brilho)' }} />}
          </button>
        )
      })}
    </nav>
  )
}
