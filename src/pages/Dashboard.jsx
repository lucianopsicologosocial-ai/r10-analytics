import React, { useState, useEffect } from 'react'
import { JOGADORES_MOCK, PARTIDAS_MOCK } from '../lib/apiEsportes'
import { detectarValor, calcularEV, probGolJogador } from '../lib/modelos'

export default function Dashboard({ session, irPara }) {
  const [alertasEV, setAlertasEV] = useState([])
  const nome = session?.user?.user_metadata?.nome || session?.user?.email?.split('@')[0] || 'Apostador'

  useEffect(() => {
    let mounted = true
    // Calcular EV+ para partidas mockadas
    const ev = PARTIDAS_MOCK.map(p => {
      const analiseHome = detectarValor(0.52, p.odds.home)
      const analiseAway = detectarValor(0.28, p.odds.away)
      return {
        ...p,
        analise_home: analiseHome,
        analise_away: analiseAway,
        melhor_aposta: analiseHome.tem_valor ? 'home' : analiseAway.tem_valor ? 'away' : null
      }
    }).filter(p => p.melhor_aposta)
    if (mounted) setAlertasEV(ev)
    return () => { mounted = false }
  }, [])

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div style={{ padding: '24px 16px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>{saudacao}, {nome} 👋</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5, marginTop: 2 }}>R10 Analytics</h1>
        </div>
        <button onClick={() => irPara('perfil')} style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--ouro)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer' }}>📊</button>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
        {[
          { icon: '🔥', val: alertasEV.length, label: 'EV+ hoje', cor: 'var(--ouro)' },
          { icon: '🔴', val: '2', label: 'Ao vivo', cor: '#dc2626' },
          { icon: '💰', val: 'R$100', label: 'Banca', cor: 'var(--verde-ev)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
            <p style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: s.cor, marginBottom: 2, fontFamily: 'monospace' }}>{s.val}</p>
            <p style={{ fontSize: 10, color: 'var(--text2)', lineHeight: 1.3 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Alertas EV+ */}
      {alertasEV.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', letterSpacing: 0.3 }}>🔥 OPORTUNIDADES EV+ HOJE</h2>
            <button onClick={() => irPara('alertas')} style={{ fontSize: 12, color: 'var(--ouro)', background: 'none', border: 'none', cursor: 'pointer' }}>Ver todos →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {alertasEV.map(p => {
              const melhor = p.melhor_aposta === 'home' ? p.analise_home : p.analise_away
              const time = p.melhor_aposta === 'home' ? p.home : p.away
              return (
                <button key={p.id} onClick={() => irPara('calculadora', { partida: p })} style={{
                  background: 'var(--bg2)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: 12,
                  padding: '14px 16px', textAlign: 'left', width: '100%', cursor: 'pointer'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{p.home} vs {p.away}</p>
                      <p style={{ fontSize: 11, color: 'var(--text2)' }}>{p.liga}</p>
                    </div>
                    <span className="ev-badge-pos">{melhor.classificacao}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className="badge badge-verde">✅ {time}</span>
                    <span className="badge badge-cinza">Odd {p.melhor_aposta === 'home' ? p.odds.home : p.odds.away}</span>
                    <span className="badge" style={{ background: 'rgba(22,163,74,0.15)', color: 'var(--verde-ev)' }}>EV {melhor.ev}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Jogadores em destaque */}
      <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', letterSpacing: 0.3, marginBottom: 12 }}>⭐ JOGADORES EM DESTAQUE</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {JOGADORES_MOCK.slice(0, 3).map(j => {
          const prob = probGolJogador(j.stats)
          return (
            <button key={j.id} onClick={() => irPara('jogador', j)} style={{
              background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 12,
              padding: '14px 16px', textAlign: 'left', width: '100%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 14
            }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg3)', border: '2px solid var(--borda-forte)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>⚽</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{j.nome}</p>
                <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{j.time} • {j.posicao}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className="badge badge-ouro">{j.stats.gols_por_jogo} gols/jogo</span>
                  <span className="badge" style={{ background: 'rgba(22,163,74,0.15)', color: 'var(--verde-ev)' }}>P(gol) {(prob*100).toFixed(0)}%</span>
                </div>
              </div>
              <span style={{ color: 'var(--text2)', fontSize: 16 }}>›</span>
            </button>
          )
        })}
      </div>

      {/* Módulos */}
      <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', letterSpacing: 0.3, marginBottom: 12 }}>MÓDULOS</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        {[
          { icon: '🧮', titulo: 'Calculadora EV', sub: 'Kelly + Valor esperado', pagina: 'calculadora' },
          { icon: '🔴', titulo: 'Ao vivo', sub: 'Partidas em tempo real', pagina: 'ao-vivo' },
          { icon: '🔔', titulo: 'Alertas', sub: 'Notificações EV+', pagina: 'alertas' },
          { icon: '💰', titulo: 'Banca', sub: 'Gestão e recuperação', pagina: 'banca' },
        ].map(m => (
          <button key={m.pagina} onClick={() => irPara(m.pagina)} style={{
            background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 12,
            padding: '16px 14px', textAlign: 'left', cursor: 'pointer'
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{m.icon}</div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{m.titulo}</p>
            <p style={{ fontSize: 11, color: 'var(--text2)' }}>{m.sub}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
