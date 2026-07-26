import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { planoRecuperacao, riscoRuina } from '../lib/modelos'

export default function Banca({ session, irPara }) {
  const [bancaInicial, setBancaInicial] = useState(100)
  const [bancaAtual, setBancaAtual] = useState(100)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      try {
        const { data } = await supabase.from('profiles').select('banca_inicial, banca_atual').eq('id', session.user.id).single()
        if (data) {
          if (data.banca_inicial) setBancaInicial(data.banca_inicial)
          if (data.banca_atual) setBancaAtual(data.banca_atual)
        }
      } catch (e) { /* usa defaults */ }
      finally { setCarregando(false) }
    }
    carregar()
  }, [session])
  const [probMedia, setProbMedia] = useState(55)
  const [oddsMedia, setOddsMedia] = useState(2.1)
  const [historico, setHistorico] = useState([
    { data: '26/07', resultado: '+R$45', tipo: 'Vitória', odds: 2.1 },
    { data: '25/07', resultado: '-R$20', tipo: 'Derrota', odds: 1.8 },
    { data: '24/07', resultado: '+R$38', tipo: 'Vitória', odds: 2.4 },
  ])

  const perda = bancaInicial - bancaAtual
  const pctPerda = perda / bancaInicial
  const plano = bancaAtual < bancaInicial ? planoRecuperacao(bancaInicial, bancaAtual, probMedia/100, oddsMedia) : null
  const rr = riscoRuina(bancaAtual, bancaAtual * 0.05, (probMedia/100 * (oddsMedia-1) - (1-probMedia/100)))

  return (
    <div style={{ padding: '24px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => irPara('dashboard')} style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 8, padding: '8px 12px', color: 'var(--text2)', fontSize: 14 }}>←</button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Gestão de Banca</h1>
          <p style={{ fontSize: 12, color: 'var(--text2)' }}>Recuperação matemática e controle de risco</p>
        </div>
      </div>

      {/* Banca */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--borda-forte)', borderRadius: 14, padding: '20px', marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, letterSpacing: 1, marginBottom: 14 }}>MINHA BANCA</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>Banca inicial (R$)</label>
            <input type="number" value={bancaInicial} onChange={e => setBancaInicial(parseFloat(e.target.value))}
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg3)', border: '1px solid var(--borda)', borderRadius: 8, color: 'var(--text)', fontSize: 16, fontFamily: 'monospace' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>Banca atual (R$)</label>
            <input type="number" value={bancaAtual} onChange={e => setBancaAtual(parseFloat(e.target.value))}
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg3)', border: '1px solid var(--borda)', borderRadius: 8, color: 'var(--text)', fontSize: 16, fontFamily: 'monospace' }} />
          </div>
        </div>

        {/* Barra de saúde da banca */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>Saúde da banca</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: bancaAtual >= bancaInicial ? 'var(--verde-ev)' : pctPerda > 0.3 ? 'var(--vermelho)' : 'var(--ouro-brilho)' }}>
              {((bancaAtual/bancaInicial)*100).toFixed(1)}%
            </span>
          </div>
          <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4, transition: 'width .5s',
              width: `${Math.min(100, (bancaAtual/bancaInicial)*100)}%`,
              background: bancaAtual >= bancaInicial ? 'var(--verde-ev)' : pctPerda > 0.3 ? 'var(--vermelho)' : 'var(--ouro-brilho)'
            }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Resultado</p>
            <p style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: perda > 0 ? 'var(--vermelho)' : 'var(--verde-ev)' }}>
              {perda > 0 ? `-R$${perda.toFixed(0)}` : `+R$${Math.abs(perda).toFixed(0)}`}
            </p>
          </div>
          <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Risco de ruína</p>
            <p style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: rr < 0.05 ? 'var(--verde-ev)' : rr < 0.2 ? 'var(--ouro-brilho)' : 'var(--vermelho)' }}>
              {(rr*100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Plano de recuperação */}
      {plano && (
        <div style={{ background: pctPerda > 0.5 ? 'rgba(220,38,38,0.1)' : 'rgba(217,119,6,0.1)', border: `1px solid ${pctPerda > 0.5 ? 'rgba(220,38,38,0.3)' : 'var(--borda-forte)'}`, borderRadius: 14, padding: '16px', marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: pctPerda > 0.5 ? 'var(--vermelho)' : 'var(--ouro-brilho)', fontWeight: 600, letterSpacing: 1, marginBottom: 12 }}>
            {pctPerda > 0.5 ? '🚨 ALERTA CRÍTICO' : '📊 PLANO DE RECUPERAÇÃO'}
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, color: pctPerda > 0.5 ? '#fca5a5' : 'var(--text)', marginBottom: 10 }}>{plano.alerta}</p>
          {pctPerda <= 0.5 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Aposta segura', val: `R$${plano.aposta_segura}` },
                { label: 'Apostas estimadas', val: `~${plano.apostas_estimadas}x` },
                { label: 'Perda total', val: `R$${plano.perda_total}` },
                { label: 'Percentual perdido', val: plano.percentual_perdido },
              ].map(item => (
                <div key={item.label} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 4 }}>{item.label}</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>{item.val}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Configuração médias */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, letterSpacing: 1, marginBottom: 12 }}>PARÂMETROS MÉDIOS DAS SUAS APOSTAS</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 5, display: 'block' }}>Prob. média de acerto: {probMedia}%</label>
            <input type="range" min="40" max="75" value={probMedia} onChange={e => setProbMedia(parseFloat(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 5, display: 'block' }}>Odd média apostada: {oddsMedia}</label>
            <input type="range" min="1.3" max="5" step="0.1" value={oddsMedia} onChange={e => setOddsMedia(parseFloat(e.target.value))} style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      {/* Histórico */}
      <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', letterSpacing: 0.3, marginBottom: 12 }}>HISTÓRICO RECENTE</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {historico.map((h, i) => (
          <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 12, color: 'var(--text)', marginBottom: 2 }}>{h.tipo} • Odd {h.odds}</p>
              <p style={{ fontSize: 11, color: 'var(--text2)' }}>{h.data}</p>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', color: h.resultado.startsWith('+') ? 'var(--verde-ev)' : 'var(--vermelho)' }}>{h.resultado}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
