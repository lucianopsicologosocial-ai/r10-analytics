import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import PerfilJogador from './pages/PerfilJogador'
import Calculadora from './pages/Calculadora'
import PainelAoVivo from './pages/PainelAoVivo'
import Alertas from './pages/Alertas'
import Banca from './pages/Banca'
import Assinatura from './pages/Assinatura'
import Perfil from './pages/Perfil'
import NavBar from './components/NavBar'

export default function App() {
  const [session, setSession] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [pagina, setPagina] = useState('dashboard')
  const [extra, setExtra] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setCarregando(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (carregando) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--ouro)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📊</div>
      <p style={{ color: 'var(--text2)', fontSize: 14 }}>Carregando Analytics...</p>
    </div>
  )

  if (!session) return <Auth onLogin={s => setSession(s)} />

  const irPara = (p, dados = null) => { setExtra(dados); setPagina(p); window.scrollTo(0, 0) }

  const renderPagina = () => {
    switch (pagina) {
      case 'dashboard':   return <Dashboard session={session} irPara={irPara} />
      case 'jogador':     return <PerfilJogador session={session} irPara={irPara} jogador={extra} />
      case 'calculadora': return <Calculadora session={session} irPara={irPara} dados={extra} />
      case 'ao-vivo':     return <PainelAoVivo session={session} irPara={irPara} />
      case 'alertas':     return <Alertas session={session} irPara={irPara} />
      case 'banca':       return <Banca session={session} irPara={irPara} />
      case 'assinatura':  return <Assinatura session={session} irPara={irPara} />
      case 'perfil':      return <Perfil session={session} irPara={irPara} />
      default:            return <Dashboard session={session} irPara={irPara} />
    }
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 72 }}>
      {renderPagina()}
      <NavBar pagina={pagina} irPara={irPara} />
    </div>
  )
}
