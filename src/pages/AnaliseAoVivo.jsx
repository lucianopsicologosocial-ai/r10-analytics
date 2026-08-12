import React, { useState, useEffect, useRef } from 'react'
import { detectarValor } from '../lib/modelos'

const CORES = {
  home: 'var(--ouro)',
  draw: 'var(--text2)',
  away: 'var(--verde-ev)'
}

const CONFIANCA_COR = { alta: 'var(--verde-ev)', media: 'var(--ouro)', baixa: 'var(--vermelho)' }

function BarraProbabilidade({ home, draw, away, nomeHome, nomeAway }) {
  const total = parseFloat(home) + parseFloat(draw) + parseFloat(away)
  const ph = (parseFloat(home) / total * 100).toFixed(1)
  const pd = (parseFloat(draw) / total * 100).toFixed(1)
  const pa = (parseFloat(away) / total * 100).toFixed(1)
  return (
    <div>
      <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 8, gap: 2 }}>
        <div style={{ width: ph + '%', background: 'var(--ouro)', transition: 'width 0.8s ease' }} />
        <div style={{ width: pd + '%', background: 'var(--text2)', transition: 'width 0.8s ease' }} />
        <div style={{ width: pa + '%', background: 'var(--verde-ev)', transition: 'width 0.8s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)' }}>
        <span style={{ color: 'var(--ouro)', fontWeight: 600 }}>{nomeHome?.split(' ')[0]} {ph}%</span>
        <span>Empate {pd}%</span>
        <span style={{ color: 'var(--verde-ev)', fontWeight: 600 }}>{nomeAway?.split(' ')[0]} {pa}%</span>
      </div>
    </div>
  )
}

function GaugeMomentum({ momentum, home, away }) {
  const pos = momentum === 'home' ? 15 : momentum === 'away' ? 85 : 50
  return (
    <div style={{ margin: '10px 0' }}>
      <div style={{ position: 'relative', height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'visible' }}>
        <div style={{
          position: 'absolute', left: `${pos}%`, top: '50%',
          transform: 'translate(-50%,-50%)',
          width: 18, height: 18, borderRadius: '50%',
          background: momentum === 'home' ? 'var(--ouro)' : momentum === 'away' ? 'var(--verde-ev)' : 'var(--text2)',
          border: '2px solid var(--bg)',
          transition: 'left 0.8s ease',
          boxShadow: '0 0 8px rgba(0,0,0,0.3)'
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)', marginTop: 6 }}>
        <span>{home?.split(' ')[0]}</span>
        <span>Equilibrado</span>
        <span>{away?.split(' ')[0]}</span>
      </div>
    </div>
  )
}

export default function AnaliseAoVivo({ session, irPara, dadosJogo }) {
  const [jogo, setJogo] = useState(dadosJogo || null)
  const [analise, setAnalise] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)
  const [historico, setHistorico] = useState([])
  const [autoAtualizar, setAutoAtualizar] = useState(false)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null)
  const [countdown, setCountdown] = useState(60)
  const timerRef = useRef(null)
  const countRef = useRef(null)

  // Formulário manual se não tiver jogo pré-carregado
  const [form, setForm] = useState({
    home: dadosJogo?.home || '',
    away: dadosJogo?.away || '',
    minuto: dadosJogo?.minuto || '45',
    golsCasa: dadosJogo?.placar?.[0]?.toString() || '0',
    golsFora: dadosJogo?.placar?.[1]?.toString() || '0',
    liga: dadosJogo?.liga || '',
    matchId: dadosJogo?.id || ''
  })

  const analisar = async (params = form) => {
    if (!params.home || !params.away) return
    setCarregando(true)
    setErro(null)
    try {
      const q = new URLSearchParams({
        home: params.home, away: params.away,
        minuto: params.minuto, golsCasa: params.golsCasa,
        golsFora: params.golsFora, liga: params.liga,
        matchId: params.matchId || ''
      })
      const res = await fetch(`/api/esportes/analise-ao-vivo?${q}`)
      const data = await res.json()
      if (data.erro) { setErro(data.erro); return }
      setAnalise(data)
      setUltimaAtualizacao(new Date())
      setCountdown(60)
      // Guardar no histórico
      setHistorico(h => [{
        minuto: params.minuto,
        placar: [parseInt(params.golsCasa), parseInt(params.golsFora)],
        prob: data.analise?.prob_final,
        momentum: data.analise?.momentum,
        ts: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }, ...h].slice(0, 10))
    } catch (e) {
      setErro('Erro ao analisar: ' + e.message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    if (autoAtualizar) {
      timerRef.current = setInterval(() => analisar(), 60000)
      countRef.current = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 60), 1000)
    } else {
      clearInterval(timerRef.current)
      clearInterval(countRef.current)
    }
    return () => { clearInterval(timerRef.current); clearInterval(countRef.current) }
  }, [autoAtualizar, form])

  const a = analise?.analise
  const modelos = analise?.modelos

  return (
    <div style={{ padding: '20px 16px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => irPara('ao-vivo')} style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 8, padding: '8px 12px', color: 'var(--text2)', fontSize: 14 }}>←</button>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Análise por IA ao vivo</h1>
          <p style={{ fontSize: 12, color: 'var(--text2)' }}>Poisson + xG + Mercado + Claude</p>
        </div>
        {ultimaAtualizacao && (
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <p style={{ fontSize: 10, color: 'var(--text2)' }}>{ultimaAtualizacao.toLocaleTimeString('pt-BR')}</p>
            {autoAtualizar && <p style={{ fontSize: 10, color: 'var(--ouro)' }}>Próxima em {countdown}s</p>}
          </div>
        )}
      </div>

      {/* Formulário */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: 1, marginBottom: 12 }}>DADOS DO JOGO</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          {[['home', 'Time da casa'], ['away', 'Time visitante'], ['liga', 'Liga/Competição'], ['matchId', 'ID do jogo (opcional)']].map(([k, l]) => (
            <div key={k}>
              <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{l}</p>
              <input value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                placeholder={l} style={{ width: '100%', padding: '8px 10px', background: 'var(--bg3)', border: '1px solid var(--borda)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[['minuto', 'Minuto'], ['golsCasa', 'Gols casa'], ['golsFora', 'Gols fora']].map(([k, l]) => (
            <div key={k}>
              <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{l}</p>
              <input type="number" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', background: 'var(--bg3)', border: '1px solid var(--borda)', borderRadius: 8, color: 'var(--text)', fontSize: 14, fontFamily: 'monospace', textAlign: 'center' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => analisar()} disabled={carregando || !form.home}
            style={{ flex: 1, padding: '12px', background: carregando ? 'var(--bg3)' : 'var(--ouro)', border: 'none', borderRadius: 10, color: carregando ? 'var(--text2)' : '#000', fontWeight: 700, fontSize: 14, cursor: carregando ? 'not-allowed' : 'pointer' }}>
            {carregando ? '⏳ Analisando...' : '⚡ Analisar com IA'}
          </button>
          <button onClick={() => setAutoAtualizar(a => !a)}
            style={{ padding: '12px 16px', background: autoAtualizar ? 'rgba(22,163,74,0.15)' : 'var(--bg3)', border: `1px solid ${autoAtualizar ? 'rgba(22,163,74,0.4)' : 'var(--borda)'}`, borderRadius: 10, color: autoAtualizar ? 'var(--verde-ev)' : 'var(--text2)', fontSize: 12, cursor: 'pointer' }}>
            {autoAtualizar ? '⏸ Pausar' : '▶ Auto 60s'}
          </button>
        </div>
      </div>

      {erro && (
        <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 13, color: '#fca5a5' }}>
          ⚠️ {erro}
        </div>
      )}

      {a && (
        <>
          {/* Placar e resumo */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 14, padding: 16, marginBottom: 12, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>{analise.jogo.liga} · {analise.jogo.minuto}'</p>
            <p style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text)', marginBottom: 4 }}>
              {analise.jogo.home} <span style={{ color: 'var(--ouro)' }}>{analise.jogo.placar[0]}</span>
              <span style={{ color: 'var(--text2)', margin: '0 8px' }}>×</span>
              <span style={{ color: 'var(--verde-ev)' }}>{analise.jogo.placar[1]}</span> {analise.jogo.away}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: `${CONFIANCA_COR[a.confianca]}22`, color: CONFIANCA_COR[a.confianca], fontWeight: 600 }}>
                Confiança {a.confianca}
              </span>
            </div>
          </div>

          {/* Probabilidade final */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 14, padding: 16, marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: 1, marginBottom: 12 }}>PROBABILIDADE FINAL (IA)</p>
            <BarraProbabilidade {...a.prob_final} nomeHome={analise.jogo.home} nomeAway={analise.jogo.away} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
              {[['home', analise.jogo.home, 'var(--ouro)'], ['draw', 'Empate', 'var(--text2)'], ['away', analise.jogo.away, 'var(--verde-ev)']].map(([k, nome, cor]) => (
                <div key={k} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{nome?.split(' ')[0]}</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: cor, fontFamily: 'monospace' }}>{parseFloat(a.prob_final[k]).toFixed(1)}%</p>
                </div>
              ))}
            </div>
          </div>

          {/* Momentum */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 14, padding: 16, marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: 1, marginBottom: 10 }}>MOMENTUM DO JOGO</p>
            <GaugeMomentum momentum={a.momentum} home={analise.jogo.home} away={analise.jogo.away} />
            <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8, textAlign: 'center', fontStyle: 'italic' }}>{a.momentum_motivo}</p>
          </div>

          {/* Insight tático */}
          <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', borderRadius: 14, padding: 14, marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: 'var(--ouro)', fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>INSIGHT TÁTICO DA IA</p>
            <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{a.insight_tatico}</p>
          </div>

          {/* EV alert */}
          {a.ev_alert?.existe && (
            <div style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: 14, padding: 14, marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: 'var(--verde-ev)', fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>🎯 OPORTUNIDADE EV+ DETECTADA</p>
              <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>{a.ev_alert.mercado}</p>
              {a.ev_alert.ev_percent && <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--verde-ev)', fontFamily: 'monospace' }}>+{a.ev_alert.ev_percent}% EV</p>}
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{a.ev_alert.recomendacao}</p>
            </div>
          )}

          {/* Modelos internos */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 14, padding: 16, marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: 1, marginBottom: 12 }}>MODELOS MATEMÁTICOS</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                ['Poisson', `${modelos?.poisson?.home}% / ${modelos?.poisson?.draw}% / ${modelos?.poisson?.away}%`, 'Modelo probabilístico'],
                ['xG casa', modelos?.xg?.xgCasa + ' gols esp.', 'Gols esperados'],
                ['xG fora', modelos?.xg?.xgFora + ' gols esp.', 'Gols esperados'],
              ].map(([t, v, s]) => (
                <div key={t} style={{ background: 'var(--bg3)', borderRadius: 8, padding: 10 }}>
                  <p style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 3 }}>{t}</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace' }}>{v}</p>
                  <p style={{ fontSize: 10, color: 'var(--text2)', marginTop: 2 }}>{s}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Histórico de análises */}
          {historico.length > 1 && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 14, padding: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: 1, marginBottom: 10 }}>EVOLUÇÃO DA PROBABILIDADE</p>
              {historico.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: i > 0 ? '1px solid var(--borda)' : 'none' }}>
                  <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'monospace', width: 36 }}>{h.ts}</span>
                  <span style={{ fontSize: 11, color: 'var(--ouro)', width: 28, fontFamily: 'monospace' }}>{h.minuto}'</span>
                  <span style={{ fontSize: 11, color: 'var(--text2)', width: 30, fontFamily: 'monospace' }}>{h.placar[0]}×{h.placar[1]}</span>
                  <div style={{ flex: 1 }}>
                    {h.prob && (
                      <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', gap: 1 }}>
                        <div style={{ width: h.prob.home + '%', background: 'var(--ouro)', transition: 'width .5s' }} />
                        <div style={{ width: h.prob.draw + '%', background: 'var(--text2)' }} />
                        <div style={{ width: h.prob.away + '%', background: 'var(--verde-ev)' }} />
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: h.momentum === 'home' ? 'var(--ouro)' : h.momentum === 'away' ? 'var(--verde-ev)' : 'var(--text2)', width: 40, textAlign: 'right' }}>
                    {h.momentum === 'home' ? '← Casa' : h.momentum === 'away' ? 'Fora →' : '= Equal'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!a && !carregando && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text2)' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>⚡</p>
          <p style={{ fontSize: 14, marginBottom: 6 }}>Preencha os dados do jogo acima</p>
          <p style={{ fontSize: 12 }}>A IA combina 3 modelos matemáticos para gerar a probabilidade em tempo real</p>
        </div>
      )}
    </div>
  )
}
