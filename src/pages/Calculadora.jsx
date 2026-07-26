import React, { useState, useEffect } from 'react'
import { calcularEV, kelly, apostaKelly, detectarValor, removerVig, riscoRuina } from '../lib/modelos'

export default function Calculadora({ session, irPara, dados }) {
  const [prob, setProb] = useState(dados?.prob ? (dados.prob * 100).toFixed(1) : '')
  const [odds, setOdds] = useState(dados?.odds || '')
  const [odds2, setOdds2] = useState('')
  const [banca, setBanca] = useState(dados?.banca || '100')
  const [resultado, setResultado] = useState(null)
  const [aba, setAba] = useState('ev') // ev | kelly | vig | ruina

  const calcular = () => {
    const p = parseFloat(prob) / 100
    const o = parseFloat(odds)
    const b = parseFloat(banca)
    if (!p || p <= 0 || p >= 1) return // probabilidade inválida
    if (!o || o <= 1.01) return // odd mínima válida
    if (!b || b < 1) return // banca mínima R

    const ev = calcularEV(p, o, 100)
    const k = apostaKelly(b, p, o, 0.25)
    const valor = detectarValor(p, o)

    setResultado({ ev, k, valor, p, o, b })
  }

  useEffect(() => { if (prob && odds) calcular() }, [prob, odds, banca])

  const abas = [
    { id: 'ev', label: 'EV' },
    { id: 'kelly', label: 'Kelly' },
    { id: 'vig', label: 'Vig' },
    { id: 'ruina', label: 'Ruína' },
  ]

  return (
    <div style={{ padding: '24px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => irPara('dashboard')} style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 8, padding: '8px 12px', color: 'var(--text2)', fontSize: 14 }}>←</button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Calculadora</h1>
          <p style={{ fontSize: 12, color: 'var(--text2)' }}>EV, Kelly, Vig e Risco de Ruína</p>
        </div>
      </div>

      {/* Inputs principais */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 14, padding: '16px', marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, letterSpacing: 1, marginBottom: 12 }}>PARÂMETROS</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 5, display: 'block' }}>Probabilidade real estimada (%)</label>
            <input type="number" value={prob} onChange={e => setProb(e.target.value)}
              placeholder="Ex: 55" min="1" max="99" step="0.5"
              style={{ width: '100%', padding: '12px 16px', background: 'var(--bg3)', border: '1px solid var(--borda)', borderRadius: 10, color: 'var(--text)', fontSize: 16, fontFamily: 'monospace' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 5, display: 'block' }}>Odd decimal oferecida pela casa</label>
            <input type="number" value={odds} onChange={e => setOdds(e.target.value)}
              placeholder="Ex: 2.10" min="1.01" step="0.01"
              style={{ width: '100%', padding: '12px 16px', background: 'var(--bg3)', border: '1px solid var(--borda)', borderRadius: 10, color: 'var(--text)', fontSize: 16, fontFamily: 'monospace' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 5, display: 'block' }}>Banca total (R$)</label>
            <input type="number" value={banca} onChange={e => setBanca(e.target.value)}
              placeholder="Ex: 500" min="1"
              style={{ width: '100%', padding: '12px 16px', background: 'var(--bg3)', border: '1px solid var(--borda)', borderRadius: 10, color: 'var(--text)', fontSize: 16, fontFamily: 'monospace' }} />
          </div>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {abas.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)} style={{
            flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 500,
            background: aba === a.id ? 'var(--ouro)' : 'var(--bg2)',
            color: aba === a.id ? '#fff' : 'var(--text2)',
            border: aba === a.id ? 'none' : '1px solid var(--borda)', cursor: 'pointer'
          }}>{a.label}</button>
        ))}
      </div>

      {resultado && aba === 'ev' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            background: resultado.valor.tem_valor ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
            border: `2px solid ${resultado.valor.tem_valor ? 'rgba(22,163,74,0.4)' : 'rgba(220,38,38,0.3)'}`,
            borderRadius: 14, padding: '18px', textAlign: 'center'
          }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>{resultado.valor.tem_valor ? '✅' : '❌'}</p>
            <p className="num-grande" style={{ color: resultado.valor.tem_valor ? 'var(--verde-ev)' : 'var(--vermelho)', marginBottom: 4 }}>
              {resultado.valor.classificacao}
            </p>
            <p style={{ fontSize: 14, color: 'var(--text2)' }}>EV de R${resultado.ev.ev} por R$100 apostados</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Sua P real', val: resultado.valor.prob_real, cor: 'var(--ouro-brilho)' },
              { label: 'P implícita (odd)', val: resultado.valor.prob_implicita, cor: 'var(--text2)' },
              { label: 'Vantagem', val: resultado.valor.vantagem, cor: resultado.valor.tem_valor ? 'var(--verde-ev)' : 'var(--vermelho)' },
              { label: 'EV %', val: resultado.ev.evPercent + '%', cor: resultado.ev.positivo ? 'var(--verde-ev)' : 'var(--vermelho)' },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>{item.label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: item.cor, fontFamily: 'monospace' }}>{item.val}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {resultado && aba === 'kelly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--borda-forte)', borderRadius: 14, padding: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8, letterSpacing: 1 }}>APOSTA RECOMENDADA (KELLY ¼)</p>
            <p className="num-grande" style={{ color: 'var(--ouro-brilho)', fontSize: 36, marginBottom: 4 }}>R${resultado.k.valorAposta}</p>
            <p style={{ fontSize: 13, color: 'var(--text2)' }}>{resultado.k.percentualBanca} da sua banca de R${resultado.b.toFixed(0)}</p>
          </div>
          <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, marginBottom: 8 }}>FÓRMULA KELLY</p>
            <p style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text)', lineHeight: 1.8 }}>
              K = (p × b - q) / b<br/>
              p = {(resultado.p*100).toFixed(0)}% | b = {(resultado.o-1).toFixed(2)} | q = {((1-resultado.p)*100).toFixed(0)}%<br/>
              K_full = {resultado.k.kelly}<br/>
              K_1/4 = {resultado.k.kelly_fracionario} ← usar este
            </p>
          </div>
          <div style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 10, padding: '12px 14px' }}>
            <p style={{ fontSize: 12, color: 'var(--verde-ev)', lineHeight: 1.5 }}>
              💡 Sempre use Kelly fracionário (1/4) para reduzir o risco de ruína. O Kelly cheio pode levar a drawdowns severos mesmo com EV+.
            </p>
          </div>
        </div>
      )}

      {aba === 'vig' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 4 }}>
            Insira as duas odds de um mercado (ex: casa e visitante) para calcular a margem da casa (vig).
          </p>
          <input type="number" value={odds} onChange={e => setOdds(e.target.value)} placeholder="Odd 1 (ex: 2.10)"
            style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 10, color: 'var(--text)', fontSize: 16, fontFamily: 'monospace' }} />
          <input type="number" value={odds2} onChange={e => setOdds2(e.target.value)} placeholder="Odd 2 (ex: 1.75)"
            style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 10, color: 'var(--text)', fontSize: 16, fontFamily: 'monospace' }} />
          {odds && odds2 && (() => {
            const o1 = parseFloat(odds), o2 = parseFloat(odds2)
            if (o1 > 1 && o2 > 1) {
              const vig = removerVig(o1, o2)
              return (
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--borda-forte)', borderRadius: 14, padding: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, textAlign: 'center' }}>
                    {[
                      { label: 'P real 1', val: (vig.p1_real*100).toFixed(1)+'%' },
                      { label: 'P real 2', val: (vig.p2_real*100).toFixed(1)+'%' },
                      { label: 'Margem casa', val: vig.margem },
                    ].map(item => (
                      <div key={item.label}>
                        <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{item.label}</p>
                        <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--ouro-brilho)', fontFamily: 'monospace' }}>{item.val}</p>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 12, lineHeight: 1.5 }}>
                    A margem representa quanto a casa "cobra" por aposta. Casas com &lt;4% são consideradas boas. Acima de 8% → evitar.
                  </p>
                </div>
              )
            }
            return null
          })()}
        </div>
      )}

      {resultado && aba === 'ruina' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--borda-forte)', borderRadius: 14, padding: '18px', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8, letterSpacing: 1 }}>RISCO DE RUÍNA</p>
            {(() => {
              const apostaMedia = parseFloat(resultado.k.valorAposta)
              const vantagem = resultado.valor.tem_valor ? parseFloat(resultado.valor.vantagem) / 100 : 0
              const rr = riscoRuina(resultado.b, apostaMedia, vantagem)
              const rrPercent = (rr * 100).toFixed(2)
              return (
                <>
                  <p className="num-grande" style={{ color: rr < 0.05 ? 'var(--verde-ev)' : rr < 0.2 ? 'var(--ouro-brilho)' : 'var(--vermelho)', fontSize: 36, marginBottom: 6 }}>
                    {rrPercent}%
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text2)' }}>de chance de perder toda a banca</p>
                  <div style={{ marginTop: 14, padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                    <p style={{ fontSize: 12, color: rr < 0.05 ? 'var(--verde-ev)' : rr < 0.2 ? 'var(--ouro-brilho)' : 'var(--vermelho)' }}>
                      {rr < 0.05 ? '✅ Risco baixo — gestão saudável' : rr < 0.2 ? '⚠️ Risco moderado — considere reduzir apostas' : '🚨 Risco alto — reduzir drasticamente o tamanho das apostas'}
                    </p>
                  </div>
                </>
              )
            })()}
          </div>
          <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, marginBottom: 8 }}>COMO REDUZIR O RISCO</p>
            <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
              • Usar Kelly ¼ (nunca Kelly cheio)<br/>
              • Apostar no máximo 5% da banca por evento<br/>
              • Parar se perder mais de 30% da banca em 1 semana<br/>
              • Manter mínimo de 20 apostas em aberto (diversificação)
            </p>
          </div>
        </div>
      )}

      {!resultado && aba !== 'vig' && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text2)' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🧮</p>
          <p>Preencha os campos acima para calcular</p>
        </div>
      )}
    </div>
  )
}
