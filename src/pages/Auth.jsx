import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Auth({ onLogin }) {
  const [modo, setModo] = useState('login')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [banca, setBanca] = useState('')
  const [erro, setErro] = useState('')
  const [load, setLoad] = useState(false)

  const submit = async e => {
    e.preventDefault(); setErro(''); setLoad(true)
    try {
      if (modo === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
        if (error) throw error
        onLogin(data.session)
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password: senha,
          options: { data: { nome, banca_inicial: parseFloat(banca) || 100 } }
        })
        if (error) throw error
        if (data.session) onLogin(data.session)
        else setErro('Verifique seu e-mail para confirmar o cadastro.')
      }
    } catch (err) {
      setErro(err.message || 'Erro ao entrar.')
    } finally { setLoad(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--ouro)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 16px' }}>📊</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5 }}>R10 Analytics</h1>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 6 }}>Apostas com matemática. EV+, Kelly, probabilidades reais.</p>
      </div>

      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', background: 'var(--bg2)', borderRadius: 10, padding: 4, marginBottom: 24, border: '1px solid var(--borda)' }}>
          {['login', 'cadastro'].map(m => (
            <button key={m} onClick={() => setModo(m)} style={{
              flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: modo === m ? 'var(--ouro)' : 'none',
              color: modo === m ? '#fff' : 'var(--text2)',
              border: 'none', cursor: 'pointer', transition: 'all .15s'
            }}>{m === 'login' ? 'Entrar' : 'Criar conta'}</button>
          ))}
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {modo === 'cadastro' && (
            <>
              <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome"
                style={{ padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 10, color: 'var(--text)', fontSize: 15 }} />
              <input type="number" value={banca} onChange={e => setBanca(e.target.value)} placeholder="Banca inicial (R$)"
                style={{ padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 10, color: 'var(--text)', fontSize: 15 }} />
            </>
          )}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail" required
            style={{ padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 10, color: 'var(--text)', fontSize: 15 }} />
          <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Senha" required
            style={{ padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 10, color: 'var(--text)', fontSize: 15 }} />

          {erro && <p style={{ color: '#fca5a5', fontSize: 13, textAlign: 'center' }}>{erro}</p>}

          <button type="submit" disabled={load} className="btn-ouro" style={{ justifyContent: 'center', padding: '14px', fontSize: 15, marginTop: 4, opacity: load ? 0.7 : 1 }}>
            {load ? 'Aguarde...' : modo === 'login' ? '📊 Entrar' : '🚀 Criar minha conta'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text2)', marginTop: 20, lineHeight: 1.5 }}>
          Análise gratuita: 3 jogadores/dia.<br/>Premium: R$39,90/mês — alertas + ao vivo.
        </p>
      </div>
    </div>
  )
}
