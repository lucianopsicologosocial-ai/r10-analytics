import React from 'react'
import { supabase } from '../supabaseClient'

export default function Perfil({ session, irPara }) {
  const nome = session?.user?.user_metadata?.nome || session?.user?.email?.split('@')[0] || 'Apostador'
  const email = session?.user?.email
  const iniciais = nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const sair = async () => { await supabase.auth.signOut(); window.location.reload() }

  return (
    <div style={{ padding: '24px 16px 0' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>Meu Perfil</h1>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 14, padding: '20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--ouro)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{iniciais}</div>
        <div>
          <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{nome}</p>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>{email}</p>
        </div>
      </div>
      {[
        { icon: '🧮', label: 'Calculadora EV + Kelly', acao: () => irPara('calculadora') },
        { icon: '🔴', label: 'Painel ao vivo', acao: () => irPara('ao-vivo') },
        { icon: '🔔', label: 'Configurar alertas', acao: () => irPara('alertas') },
        { icon: '💰', label: 'Gestão de banca', acao: () => irPara('banca') },
        { icon: '💎', label: 'Assinar Premium', acao: () => irPara('assinatura') },
      ].map(item => (
        <button key={item.label} onClick={item.acao} style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 10, padding: '14px 16px', textAlign: 'left', width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 18 }}>{item.icon}</span>
          <span style={{ fontSize: 14, color: 'var(--text)', flex: 1 }}>{item.label}</span>
          <span style={{ color: 'var(--text2)' }}>›</span>
        </button>
      ))}
      <button onClick={sair} style={{ width: '100%', background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '13px', color: '#fca5a5', fontSize: 14, cursor: 'pointer', marginTop: 8 }}>
        🚪 Sair da conta
      </button>
    </div>
  )
}
