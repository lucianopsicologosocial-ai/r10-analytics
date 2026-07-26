import React, { useState } from 'react'
import { JOGADORES_MOCK } from '../lib/apiEsportes'
import { probGolJogador, detectarValor, calcularEV, classificarJogador } from '../lib/modelos'

export default function PerfilJogador({ session, irPara, jogador: jogadorProp }) {
  const [busca, setBusca] = useState('')
  const [jogadorSel, setJogadorSel] = useState(jogadorProp || null)
  const [oddsInput, setOddsInput] = useState('')

  const jogadoresFiltrados = busca.length > 1
    ? JOGADORES_MOCK.filter(j => j.nome.toLowerCase().includes(busca.toLowerCase()))
    : JOGADORES_MOCK

  if (!jogadorSel) return (
    <div style={{ padding: '24px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => irPara('dashboard')} style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 8, padding: '8px 12px', color: 'var(--text2)', fontSize: 14 }}>←</button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Perfil do Jogador</h1>
          <p style={{ fontSize: 12, color: 'var(--text2)' }}>Análise matemática completa</p>
        </div>
      </div>
      <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar jogador..."
        style={{ width: '100%', padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 10, color: 'var(--text)', fontSize: 14, marginBottom: 16 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {jogadoresFiltrados.map(j => {
          const prob = probGolJogador(j.stats)
          const forma = j.stats.forma_recente
          return (
            <button key={j.id} onClick={() => setJogadorSel(j)} style={{
              background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 12,
              padding: '14px 16px', textAlign: 'left', width: '100%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 14
            }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg3)', border: `2px solid ${forma > 1 ? 'var(--verde-ev)' : forma > 0.9 ? 'var(--ouro)' : 'var(--vermelho)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>⚽</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{j.nome}</p>
                <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{j.time}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className="badge badge-ouro">{j.stats.gols_por_jogo} G/J</span>
                  <span className={`badge ${forma > 1 ? 'badge-verde' : forma > 0.9 ? 'badge-ouro' : 'badge-vermelho'}`}>
                    Forma {forma > 1 ? '↑' : forma > 0.9 ? '→' : '↓'} {forma}×
                  </span>
                  <span className="badge badge-cinza">P(gol) {(prob*100).toFixed(0)}%</span>
                </div>
              </div>
              <span style={{ color: 'var(--text2)', fontSize: 16 }}>›</span>
            </button>
          )
        })}
      </div>
    </div>
  )

  // Perfil detalhado
  const j = jogadorSel
  const prob_gol = probGolJogador(j.stats)
  const classif = classificarJogador(j.stats.gols_por_jogo, 0.35, 0.22)
  const forma = j.stats.forma_recente
  const odds = parseFloat(oddsInput)
  const analise = odds > 1 ? detectarValor(prob_gol, odds) : null

  const STATS = [
    { label: 'Gols/jogo', val: j.stats.gols_por_jogo, icon: '⚽' },
    { label: 'Assist./jogo', val: j.stats.assistencias_pg, icon: '🎯' },
    { label: 'Chutes/jogo', val: j.stats.chutes_ao_gol_pg, icon: '💥' },
    { label: 'Conversão', val: (j.stats.taxa_conversao*100).toFixed(0)+'%', icon: '🎪' },
    { label: 'Dribles/jogo', val: j.stats.dribles_pg, icon: '⚡' },
    { label: 'Jogos temp.', val: j.stats.jogos_temporada, icon: '📅' },
  ]

  return (
    <div style={{ padding: '0 0 24px' }}>
      {/* Header do jogador */}
      <div style={{ background: 'linear-gradient(180deg, var(--ouro-escuro), var(--bg))', padding: '24px 16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setJogadorSel(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14 }}>←</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg3)', border: `3px solid ${forma > 1.1 ? 'var(--verde-ev)' : forma > 0.9 ? 'var(--ouro-brilho)' : 'var(--vermelho)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>⚽</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: -0.5 }}>{j.nome}</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{j.time} • {j.posicao}</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <span className="badge badge-ouro">{classif.classificacao}</span>
              <span className={`badge ${forma > 1 ? 'badge-verde' : 'badge-vermelho'}`}>Forma {forma > 1 ? '↑ Alta' : '↓ Baixa'}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Probabilidade de gol */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--borda-forte)', borderRadius: 14, padding: '18px', marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, letterSpacing: 1, marginBottom: 10 }}>PROBABILIDADE DE MARCAR (MODELO POISSON)</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div>
              <p className="num-grande" style={{ color: 'var(--ouro-brilho)' }}>{(prob_gol*100).toFixed(1)}%</p>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>P(gol) em qualquer partida</p>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${prob_gol*100}%`, background: `linear-gradient(90deg, var(--verde-ev), var(--ouro-brilho))`, borderRadius: 4, transition: 'width 1s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--text2)' }}>0%</span>
                <span style={{ fontSize: 10, color: 'var(--text2)' }}>100%</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <span className="badge badge-cinza">z-score: {classif.z_score}</span>
            <span className="badge badge-ouro">Top {100 - classif.percentil}% dos atacantes</span>
          </div>
        </div>

        {/* Stats grid */}
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', letterSpacing: 0.3, marginBottom: 12 }}>ESTATÍSTICAS DA TEMPORADA</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
          {STATS.map(s => (
            <div key={s.label} style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
              <p style={{ fontSize: 16, marginBottom: 4 }}>{s.icon}</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ouro-brilho)', fontFamily: 'monospace', marginBottom: 2 }}>{s.val}</p>
              <p style={{ fontSize: 10, color: 'var(--text2)', lineHeight: 1.3 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Calculadora de valor */}
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--borda-forte)', borderRadius: 14, padding: '16px', marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, letterSpacing: 1, marginBottom: 10 }}>🧮 CALCULAR VALOR DA APOSTA</p>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>Digite a odd oferecida pela casa para marcar gol:</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input type="number" value={oddsInput} onChange={e => setOddsInput(e.target.value)}
              placeholder="Ex: 2.50" step="0.01" min="1"
              style={{ flex: 1, padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 10, color: 'var(--text)', fontSize: 16, fontFamily: 'monospace' }} />
            <button onClick={() => irPara('calculadora', { jogador: j, odds: odds, prob: prob_gol })}
              className="btn-ouro" style={{ padding: '10px 16px' }}>Calcular</button>
          </div>
          {analise && (
            <div style={{ background: analise.tem_valor ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.1)', border: `1px solid ${analise.tem_valor ? 'rgba(22,163,74,0.4)' : 'rgba(220,38,38,0.3)'}`, borderRadius: 10, padding: '12px' }}>
              <div style={{ display: 'flex', justify: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text2)' }}>Nossa P(gol)</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>{analise.prob_real}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text2)' }}>P implícita da odd</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>{analise.prob_implicita}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text2)' }}>Vantagem</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: analise.tem_valor ? 'var(--verde-ev)' : 'var(--vermelho)', fontFamily: 'monospace' }}>{analise.vantagem}</p>
                </div>
              </div>
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: analise.tem_valor ? 'var(--verde-ev)' : 'var(--vermelho)' }}>{analise.classificacao}</p>
                <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>EV: {analise.ev} por R$100 apostados</p>
              </div>
            </div>
          )}
        </div>

        {/* Alertar sobre lesão */}
        {j.stats.lesionado && (
          <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: '#fca5a5', fontWeight: 600 }}>⚠️ Jogador lesionado — não apostar</p>
          </div>
        )}

        <button className="btn-ouro" onClick={() => irPara('calculadora', { jogador: j, prob: prob_gol })} style={{ width: '100%', justifyContent: 'center' }}>
          🧮 Calculadora completa Kelly + EV
        </button>
      </div>
    </div>
  )
}
