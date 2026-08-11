import React, { useState, useEffect, useRef } from 'react'
import { PARTIDAS_MOCK } from '../lib/apiEsportes'
import { detectarValor } from '../lib/modelos'

// Chama o proxy Vercel que mantém a API key segura no servidor
const buscarPartidasAoVivo = async () => {
  const res = await fetch('/api/esportes/ao-vivo')
  return res.json()
}

const buscarProximasReais = async () => {
  try {
    const res = await fetch('/api/esportes/proximas')
    const data = await res.json()
    return data.response || []
  } catch { return [] }
}

// Estimativa de probabilidade baseada no placar ao vivo (modelo simplificado)
const estimarProbPorPlacar = (golsCasa, golsFora, minuto) => {
  const minRestante = Math.max(90 - (minuto || 45), 1)
  const fatorTempo = minRestante / 90
  // Força baseada no placar atual
  const diffGols = golsCasa - golsFora
  const probBase = diffGols > 1 ? { home: 0.78, draw: 0.12, away: 0.10 }
    : diffGols === 1 ? { home: 0.62, draw: 0.22, away: 0.16 }
    : diffGols === 0 ? { home: 0.38, draw: 0.30, away: 0.32 }
    : diffGols === -1 ? { home: 0.16, draw: 0.22, away: 0.62 }
    : { home: 0.10, draw: 0.12, away: 0.78 }
  // Quanto mais tarde no jogo, menos incerteza (reforçar o placar atual)
  const peso = 1 - fatorTempo * 0.4
  return {
    home: Math.min(0.95, probBase.home * (1 + peso * diffGols * 0.05)),
    draw: probBase.draw * (1 - peso * Math.abs(diffGols) * 0.1),
    away: Math.min(0.95, probBase.away * (1 - peso * diffGols * 0.05)),
  }
}

const converterPartida = (f) => {
  const golsCasa = f.goals?.home ?? 0
  const golsFora = f.goals?.away ?? 0
  const minuto = f.fixture?.status?.elapsed ?? 45
  // Odds da API se disponíveis, senão estimativa pelo placar
  const odds_live = f.odds_live || { home: 2.00, draw: 3.30, away: 3.50 }
  const prob_est = estimarProbPorPlacar(golsCasa, golsFora, minuto)
  return {
    id: String(f.fixture.id),
    home: f.teams.home.name,
    away: f.teams.away.name,
    placar: [golsCasa, golsFora],
    min: minuto,
    liga: f.league.name,
    status: 'ao-vivo',
    odds_live,
    prob_est,
    logoHome: f.teams.home.logo,
    logoAway: f.teams.away.logo,
    logoLiga: f.league.logo,
  }
}

export default function PainelAoVivo({ session, irPara }) {
  const [partidas, setPartidas] = useState([])
  const [proximasReais, setProximasReais] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [alertaEV, setAlertaEV] = useState([])
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null)
  const timer = useRef(null)

  const atualizar = async () => {
    try {
      const data = await buscarPartidasAoVivo()
      // Verificar erro de conta suspensa
      if (data.errors && Object.keys(data.errors).length > 0) {
        const errStr = JSON.stringify(data.errors)
        if (errStr.includes('suspended')) {
          setErro('API suspensa — use a calculadora manual para análise ao vivo')
        } else if (errStr.includes('quota') || errStr.includes('limit')) {
          setErro('Limite diário de requisições atingido. Renova às 21h (horário de Brasília)')
        } else {
          setErro('Erro na API: ' + errStr)
        }
        return
      }
      // Verificar acesso negado no campo access
      if (data.access && data.access.includes('suspended')) {
        setErro('API suspensa — use a calculadora manual para análise ao vivo')
        return
      }
      const convertidas = (data.response || []).map(converterPartida)
      setPartidas(convertidas)
      setUltimaAtualizacao(new Date())
      setErro(null)
    } catch (e) {
      setErro('Falha ao buscar partidas: ' + e.message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    atualizar()
    buscarProximasReais().then(p => { if (p.length > 0) setProximasReais(p) })
    const isPremium = session?.user?.user_metadata?.plano === 'premium'
    const intervalo = isPremium ? 30000 : 120000
    timer.current = setInterval(atualizar, intervalo)
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
          <p style={{ fontSize: 12, color: 'var(--text2)' }}>
            {carregando ? 'Buscando partidas...' : `${partidas.length} partida${partidas.length !== 1 ? 's' : ''} ao vivo`}
            {ultimaAtualizacao && ` • ${ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: carregando ? '#f59e0b' : '#dc2626', boxShadow: `0 0 6px ${carregando ? '#f59e0b' : '#dc2626'}` }} />
          <button onClick={atualizar} style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 6, padding: '4px 8px', color: 'var(--text2)', fontSize: 11, cursor: 'pointer' }}>↻</button>
        </div>
      </div>

      {erro && (
        <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: '#fbbf24', marginBottom: erro.includes('suspensa') ? 8 : 0 }}>⚠️ {erro}</p>
          {erro.includes('suspensa') && (
            <button onClick={() => irPara('calculadora')} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, background: 'var(--ouro)', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 600 }}>
              Abrir Calculadora →
            </button>
          )}
        </div>
      )}

      {carregando && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>
          <p style={{ fontSize: 24, marginBottom: 8 }}>⚽</p>
          <p style={{ fontSize: 14 }}>Buscando partidas ao vivo...</p>
        </div>
      )}

      {!carregando && partidas.length === 0 && !erro && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text2)' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>😴</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>Nenhuma partida ao vivo</p>
          <p style={{ fontSize: 13 }}>Confira as próximas partidas abaixo</p>
        </div>
      )}

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
              <button onClick={() => irPara('calculadora', { prob: parseFloat(a.analise.prob_real), odds: 0 })}
                style={{ background: 'var(--verde-ev)', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, color: '#fff', cursor: 'pointer' }}>
                Calcular
              </button>
            </div>
          ))}
        </div>
      )}

      {partidas.length > 0 && (
        <>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', letterSpacing: 0.3, marginBottom: 12 }}>PARTIDAS AO VIVO</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {partidas.map(p => (
              <div key={p.id} style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ background: 'var(--bg3)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {p.logoLiga && <img src={p.logoLiga} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />}
                    <span style={{ fontSize: 11, color: 'var(--text2)' }}>{p.liga}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626' }} />
                    <span style={{ fontSize: 11, color: '#fca5a5', fontWeight: 600 }}>{p.min}'</span>
                  </div>
                </div>
                <div style={{ padding: '16px 14px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                    <div style={{ flex: 1, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                      {p.logoHome && <img src={p.logoHome} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />}
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.home}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--ouro-brilho)', fontFamily: 'monospace' }}>{p.placar[0]}</span>
                      <span style={{ fontSize: 18, color: 'var(--text2)' }}>×</span>
                      <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--ouro-brilho)', fontFamily: 'monospace' }}>{p.placar[1]}</span>
                    </div>
                    <div style={{ flex: 1, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.away}</p>
                      {p.logoAway && <img src={p.logoAway} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />}
                    </div>
                  </div>
                </div>
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
        </>
      )}

      <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', letterSpacing: 0.3, marginBottom: 12 }}>PRÓXIMAS PARTIDAS</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(proximasReais.length > 0 ? proximasReais : PARTIDAS_MOCK).map(p => (
          <div key={p.id} style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.home} vs {p.away}</p>
              <p style={{ fontSize: 11, color: 'var(--text2)' }}>{p.liga} • {new Date(p.data).toLocaleDateString('pt-BR')}</p>
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
