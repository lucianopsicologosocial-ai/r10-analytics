import React, { useState, useEffect, useRef } from 'react'
import { PARTIDAS_MOCK, JOGADORES_MOCK } from '../lib/apiEsportes'
import { detectarValor, probGolJogador } from '../lib/modelos'

// Simula partidas ao vivo com placar variando
const gerarPartidaAoVivo = () => [
  { id: 'L001', home: 'Flamengo', away: 'Palmeiras', placar: [1, 0], min: 67, liga: 'Brasileirão', odds_live: { home: 1.55, draw: 3.80, away: 5.20 }, status: 'ao-vivo', prob_est: { home: 0.72, draw: 0.18, away: 0.10 } },
  { id: 'L002', home: 'PSG', away: 'Man City', placar: [0, 0], min: 23, liga: 'Champions League', odds_live: { home: 2.20, draw: 3.30, away: 3.10 }, status: 'ao-vivo', prob_est: { home: 0.38, draw: 0.30, away: 0.32 } },
]

export default function PainelAoVivo({ session, irPara }) {
  const [partidas, setPartidas] = useState(gerarPartidaAoVivo())
  const [selPartida, setSelPartida] = useState(null)
  const [alertaEV, setAlertaEV] = useState([])
  const timer = useRef(null)

  // Simula atualização ao vivo (premium: cada 30s | gratuito: cada 120s)
  useEffect(() => {
    const isPremium = session?.user?.user_metadata?.plano === "premium"
    const intervalo = isPremium ? 30000 : 120000
    timer.current = setInterval(() => {
      setPartidas(prev => prev.map(p => ({
        ...p,
        min: Math.min(90, p.min + Math.floor(Math.random() * 3)),
        // Flutua as odds ligeiramente
        odds_live: {
          home: Math.max(1.01, p.odds_live.home + (Math.random() - 0.5) * 0.1),
          draw: Math.max(1.01, p.odds_live.draw + (Math.random() - 0.5) * 0.05),
          away: Math.max(1.01, p.odds_live.away + (Math.random() - 0.5) * 0.1),
        }
      })))
    }, 30000)
    return () => clearInterval(timer.current)
  }, [])

  useEffect(() => {
    const evs = partidas.flatMap(p => {
      const alertas = []
      const ah = detectarValor(p.prob_est.home, p.odds_live.home)
      const ad = detectarValor(p.prob_est.draw, p.odds_live.draw)
      const aa = detectarValor(p.prob_est.away, p.odds_live.away)
      if (ah.tem_valor) alertas.push({ partida: p, mercado: 'Casa', analise: ah, time: p.home })
      if (ad.tem_valor) alertas.push({ partida: p, mercado: 'Empate', analise: ad, time: 'Empate' })
      if (aa.tem_valor) alertas.push({ partida: p, mercado: 'Visitante', analise: aa, time: p.away })
      return alertas
    })
    setAlertaEV(evs)
  }, [partidas])

  return (
    <div style={{ padding: '24px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => irPara('dashboard')} style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 8, padding: '8px 12px', color: 'var(--text2)', fontSize: 14 }}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Ao Vivo</h1>
          <p style={{ fontSize: 12, color: 'var(--text2)' }}>{partidas.length} partidas • Atualiza a cada 30s</p>
        </div>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626', boxShadow: '0 0 6px #dc2626' }} />
      </div>

      {/* Alertas EV ao vivo */}
      {alertaEV.length > 0 && (
        <div style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: 'var(--verde-ev)', fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>🔥 EV+ DETECTADO AO VIVO</p>
          {alertaEV.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, padding: '8px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{a.partida.home} vs {a.partida.away}</p>
                <p style={{ fontSize: 11, color: 'var(--text2)' }}>{a.mercado}: {a.time}</p>
              </div>
              <span className="ev-badge-pos">{a.analise.ev} EV</span>
              <button onClick={() => irPara('calculadora', { prob: parseFloat(a.analise.prob_real)/100, odds: 0 })}
                style={{ background: 'var(--verde-ev)', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, color: '#fff', cursor: 'pointer' }}>
                Calcular
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Partidas ao vivo */}
      <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', letterSpacing: 0.3, marginBottom: 12 }}>PARTIDAS AO VIVO</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {partidas.map(p => (
          <div key={p.id} style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 14, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ background: 'var(--bg3)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>{p.liga}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626' }} />
                <span style={{ fontSize: 11, color: '#fca5a5', fontWeight: 600 }}>{p.min}'</span>
              </div>
            </div>

            {/* Placar */}
            <div style={{ padding: '16px 14px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', flex: 1, textAlign: 'right' }}>{p.home}</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--ouro-brilho)', fontFamily: 'monospace' }}>{p.placar[0]}</span>
                  <span style={{ fontSize: 18, color: 'var(--text2)' }}>×</span>
                  <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--ouro-brilho)', fontFamily: 'monospace' }}>{p.placar[1]}</span>
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', flex: 1, textAlign: 'left' }}>{p.away}</p>
              </div>
            </div>

            {/* Odds ao vivo */}
            <div style={{ padding: '0 14px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: p.home, odds: p.odds_live.home, prob: p.prob_est.home },
                { label: 'Empate', odds: p.odds_live.draw, prob: p.prob_est.draw },
                { label: p.away, odds: p.odds_live.away, prob: p.prob_est.away },
              ].map(m => {
                const analise = detectarValor(m.prob, m.odds)
                return (
                  <button key={m.label} onClick={() => irPara('calculadora', { prob: m.prob, odds: m.odds })} style={{
                    background: analise.tem_valor ? 'rgba(22,163,74,0.15)' : 'var(--bg3)',
                    border: `1px solid ${analise.tem_valor ? 'rgba(22,163,74,0.4)' : 'var(--borda)'}`,
                    borderRadius: 8, padding: '10px 6px', textAlign: 'center', cursor: 'pointer'
                  }}>
                    <p style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: analise.tem_valor ? 'var(--verde-ev)' : 'var(--text)', fontFamily: 'monospace' }}>{m.odds.toFixed(2)}</p>
                    {analise.tem_valor && <p style={{ fontSize: 9, color: 'var(--verde-ev)', marginTop: 2 }}>EV+</p>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Próximas partidas */}
      <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', letterSpacing: 0.3, marginBottom: 12 }}>PRÓXIMAS PARTIDAS</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {PARTIDAS_MOCK.map(p => (
          <div key={p.id} style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.home} vs {p.away}</p>
                <p style={{ fontSize: 11, color: 'var(--text2)' }}>{p.liga} • {new Date(p.data).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: 'Casa', odds: p.odds.home },
                { label: 'Empate', odds: p.odds.draw },
                { label: 'Fora', odds: p.odds.away },
              ].map(m => (
                <div key={m.label} style={{ flex: 1, background: 'var(--bg3)', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 3 }}>{m.label}</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace' }}>{m.odds}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
