import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { riscoRuina } from '../lib/modelos'

const MERCADOS = ['1x2 Casa', '1x2 Empate', '1x2 Fora', 'Mais de 2.5', 'Menos de 2.5', 'BTTS Sim', 'BTTS Não', 'Handicap', 'Outro']

function GraficoEvolucao({ apostas, bancaInicial }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || apostas.length === 0) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)

    // Calcular evolução acumulada
    let pontos = [{ x: 0, y: bancaInicial }]
    let banca = bancaInicial
    apostas.slice().reverse().forEach((a, i) => {
      banca += a.resultado === 'ganhou' ? a.lucro : -a.valor
      pontos.push({ x: i + 1, y: banca })
    })

    const minY = Math.min(...pontos.map(p => p.y), bancaInicial * 0.7)
    const maxY = Math.max(...pontos.map(p => p.y), bancaInicial * 1.3)
    const rangeY = maxY - minY || 1
    const pad = { t: 16, b: 24, l: 50, r: 16 }
    const W2 = W - pad.l - pad.r, H2 = H - pad.t - pad.b

    const toX = i => pad.l + (i / Math.max(pontos.length - 1, 1)) * W2
    const toY = v => pad.t + H2 - ((v - minY) / rangeY) * H2

    // Grade horizontal
    ctx.strokeStyle = 'rgba(134,239,172,0.08)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (i / 4) * H2
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke()
    }

    // Linha de referência (banca inicial)
    const yRef = toY(bancaInicial)
    ctx.strokeStyle = 'rgba(234,179,8,0.3)'
    ctx.setLineDash([4, 4])
    ctx.beginPath(); ctx.moveTo(pad.l, yRef); ctx.lineTo(W - pad.r, yRef); ctx.stroke()
    ctx.setLineDash([])

    // Área preenchida
    const ultimaY = pontos[pontos.length - 1].y
    const corLinha = ultimaY >= bancaInicial ? '#22c55e' : '#ef4444'
    ctx.beginPath()
    pontos.forEach((p, i) => i === 0 ? ctx.moveTo(toX(i), toY(p.y)) : ctx.lineTo(toX(i), toY(p.y)))
    ctx.lineTo(toX(pontos.length - 1), H - pad.b)
    ctx.lineTo(pad.l, H - pad.b)
    ctx.closePath()
    ctx.fillStyle = ultimaY >= bancaInicial ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)'
    ctx.fill()

    // Linha principal
    ctx.beginPath()
    ctx.strokeStyle = corLinha
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    pontos.forEach((p, i) => i === 0 ? ctx.moveTo(toX(i), toY(p.y)) : ctx.lineTo(toX(i), toY(p.y)))
    ctx.stroke()

    // Pontos
    pontos.forEach((p, i) => {
      ctx.beginPath()
      ctx.arc(toX(i), toY(p.y), 3, 0, Math.PI * 2)
      ctx.fillStyle = corLinha
      ctx.fill()
    })

    // Labels eixo Y
    ctx.fillStyle = 'rgba(134,239,172,0.5)'
    ctx.font = '10px monospace'
    ctx.textAlign = 'right'
    for (let i = 0; i <= 4; i++) {
      const v = minY + (rangeY * (4 - i) / 4)
      ctx.fillText('R$' + v.toFixed(0), pad.l - 4, pad.t + (i / 4) * H2 + 4)
    }
  }, [apostas, bancaInicial])

  if (apostas.length === 0) return (
    <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontSize: 13 }}>
      Registre apostas para ver o gráfico
    </div>
  )
  return <canvas ref={canvasRef} width={600} height={140} style={{ width: '100%', height: 140 }} />
}

export default function Banca({ session, irPara }) {
  const [bancaInicial, setBancaInicial] = useState(500)
  const [bancaAtual, setBancaAtual] = useState(500)
  const [apostas, setApostas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState('painel')
  const [form, setForm] = useState({
    jogo: '', mercado: '1x2 Casa', odd: '', valor: '', resultado: 'ganhou',
    data: new Date().toISOString().slice(0, 10), nota: ''
  })

  useEffect(() => { carregar() }, [session])

  const carregar = async () => {
    try {
      const { data: perfil } = await supabase.from('profiles')
        .select('banca_inicial, banca_atual').eq('id', session.user.id).single()
      if (perfil?.banca_inicial) setBancaInicial(perfil.banca_inicial)
      if (perfil?.banca_atual) setBancaAtual(perfil.banca_atual)

      const { data: aps } = await supabase.from('apostas')
        .select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(50)
      if (aps) setApostas(aps)
    } catch {}
    setCarregando(false)
  }

  const salvarBanca = async () => {
    setSalvando(true)
    await supabase.from('profiles').upsert({ id: session.user.id, banca_inicial: bancaInicial, banca_atual: bancaAtual })
    setSalvando(false)
  }

  const registrarAposta = async () => {
    if (!form.jogo || !form.odd || !form.valor) return
    setSalvando(true)
    const odd = parseFloat(form.odd), valor = parseFloat(form.valor)
    const lucro = form.resultado === 'ganhou' ? valor * (odd - 1) : 0
    const novaBanca = bancaAtual + (form.resultado === 'ganhou' ? lucro : -valor)

    const aposta = {
      user_id: session.user.id, jogo: form.jogo, mercado: form.mercado,
      odd, valor, resultado: form.resultado, lucro,
      data: form.data, nota: form.nota
    }
    const { data } = await supabase.from('apostas').insert(aposta).select().single()
    if (data) {
      setApostas(prev => [data, ...prev])
      setBancaAtual(novaBanca)
      await supabase.from('profiles').upsert({ id: session.user.id, banca_atual: novaBanca })
      setForm(f => ({ ...f, jogo: '', odd: '', valor: '', nota: '' }))
      setAbaAtiva('painel')
    }
    setSalvando(false)
  }

  const excluirAposta = async (id, aposta) => {
    await supabase.from('apostas').delete().eq('id', id)
    const reverso = aposta.resultado === 'ganhou' ? -aposta.lucro : aposta.valor
    const novaBanca = bancaAtual + reverso
    setBancaAtual(novaBanca)
    await supabase.from('profiles').upsert({ id: session.user.id, banca_atual: novaBanca })
    setApostas(prev => prev.filter(a => a.id !== id))
  }

  // Estatísticas
  const totalApostas = apostas.length
  const ganhos = apostas.filter(a => a.resultado === 'ganhou')
  const perdas = apostas.filter(a => a.resultado === 'perdeu')
  const taxaAcerto = totalApostas > 0 ? (ganhos.length / totalApostas * 100).toFixed(1) : 0
  const lucroTotal = ganhos.reduce((s, a) => s + a.lucro, 0) - perdas.reduce((s, a) => s + a.valor, 0)
  const roi = totalApostas > 0 ? (lucroTotal / apostas.reduce((s, a) => s + a.valor, 0) * 100).toFixed(1) : 0
  const saudeBanca = (bancaAtual / bancaInicial * 100).toFixed(1)
  const corSaude = bancaAtual >= bancaInicial ? 'var(--verde-ev)' : bancaAtual >= bancaInicial * 0.7 ? 'var(--ouro)' : 'var(--vermelho)'
  const rr = riscoRuina(bancaAtual, bancaAtual * 0.05, 0.05)

  if (carregando) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>Carregando...</div>

  return (
    <div style={{ padding: '20px 16px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => irPara('dashboard')} style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 8, padding: '8px 12px', color: 'var(--text2)', fontSize: 14 }}>←</button>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Gestão de Banca</h1>
          <p style={{ fontSize: 12, color: 'var(--text2)' }}>{totalApostas} apostas registradas</p>
        </div>
        <button onClick={() => setAbaAtiva('registrar')} style={{ marginLeft: 'auto', padding: '8px 16px', background: 'var(--ouro)', border: 'none', borderRadius: 10, color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Registrar aposta
        </button>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg2)', borderRadius: 10, padding: 4, marginBottom: 16, border: '1px solid var(--borda)' }}>
        {[['painel', 'Painel'], ['historico', 'Histórico'], ['registrar', 'Nova aposta']].map(([v, l]) => (
          <button key={v} onClick={() => setAbaAtiva(v)} style={{
            flex: 1, padding: '7px', fontSize: 12, fontWeight: 500, borderRadius: 7,
            border: 'none', cursor: 'pointer',
            background: abaAtiva === v ? 'var(--bg3)' : 'transparent',
            color: abaAtiva === v ? 'var(--text)' : 'var(--text2)'
          }}>{l}</button>
        ))}
      </div>

      {/* PAINEL */}
      {abaAtiva === 'painel' && (
        <>
          {/* Cards métricas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'Banca atual', val: `R$${bancaAtual.toFixed(0)}`, cor: corSaude },
              { label: 'Resultado total', val: `${lucroTotal >= 0 ? '+' : ''}R$${lucroTotal.toFixed(0)}`, cor: lucroTotal >= 0 ? 'var(--verde-ev)' : 'var(--vermelho)' },
              { label: 'Taxa de acerto', val: `${taxaAcerto}%`, cor: parseFloat(taxaAcerto) >= 55 ? 'var(--verde-ev)' : 'var(--ouro)' },
              { label: 'ROI', val: `${roi}%`, cor: parseFloat(roi) >= 0 ? 'var(--verde-ev)' : 'var(--vermelho)' },
            ].map(c => (
              <div key={c.label} style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 12, padding: '12px 14px' }}>
                <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{c.label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: c.cor }}>{c.val}</p>
              </div>
            ))}
          </div>

          {/* Saúde da banca */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>Saúde da banca</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: corSaude }}>{saudeBanca}%</span>
            </div>
            <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', width: `${Math.min(100, saudeBanca)}%`, background: corSaude, borderRadius: 4, transition: 'width .5s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)' }}>
              <span>Inicial: R${bancaInicial}</span>
              <span style={{ color: parseFloat(rr) < 5 ? 'var(--verde-ev)' : 'var(--vermelho)' }}>Risco ruína: {(rr * 100).toFixed(1)}%</span>
            </div>
          </div>

          {/* Gráfico */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600, letterSpacing: 1, marginBottom: 10 }}>EVOLUÇÃO DA BANCA</p>
            <GraficoEvolucao apostas={apostas} bancaInicial={bancaInicial} />
          </div>

          {/* Stats distribuição */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'Ganhos', val: ganhos.length, cor: 'var(--verde-ev)' },
              { label: 'Perdas', val: perdas.length, cor: 'var(--vermelho)' },
              { label: 'Total', val: totalApostas, cor: 'var(--text)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 3 }}>{s.label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: s.cor }}>{s.val}</p>
              </div>
            ))}
          </div>

          {/* Alerta */}
          {bancaAtual < bancaInicial * 0.7 && (
            <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 12, padding: 14 }}>
              <p style={{ fontSize: 12, color: 'var(--vermelho)', fontWeight: 700, marginBottom: 4 }}>🚨 ALERTA: Banca abaixo de 70%</p>
              <p style={{ fontSize: 12, color: 'var(--text2)' }}>Reduza o tamanho das apostas para 2% da banca atual até recuperar. Não tente recuperar rápido — siga o Kelly.</p>
            </div>
          )}

          {/* Editar banca inicial */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 12, padding: 14, marginTop: 12 }}>
            <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10 }}>Ajustar banca inicial</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" value={bancaInicial} onChange={e => setBancaInicial(parseFloat(e.target.value))}
                style={{ flex: 1, padding: '8px 10px', background: 'var(--bg3)', border: '1px solid var(--borda)', borderRadius: 8, color: 'var(--text)', fontSize: 14, fontFamily: 'monospace' }} />
              <button onClick={salvarBanca} disabled={salvando} style={{ padding: '8px 16px', background: 'var(--verde)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer' }}>
                {salvando ? '...' : 'Salvar'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* HISTÓRICO */}
      {abaAtiva === 'historico' && (
        <div>
          {apostas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text2)' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>📋</p>
              <p>Nenhuma aposta registrada ainda</p>
            </div>
          ) : apostas.map(a => (
            <div key={a.id} style={{ background: 'var(--bg2)', border: `1px solid ${a.resultado === 'ganhou' ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.2)'}`, borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{a.jogo}</p>
                  <p style={{ fontSize: 11, color: 'var(--text2)' }}>{a.mercado} · Odd {parseFloat(a.odd).toFixed(2)} · {a.data}</p>
                  {a.nota && <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3, fontStyle: 'italic' }}>{a.nota}</p>}
                </div>
                <div style={{ textAlign: 'right', marginLeft: 12 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: a.resultado === 'ganhou' ? 'var(--verde-ev)' : 'var(--vermelho)' }}>
                    {a.resultado === 'ganhou' ? `+R$${parseFloat(a.lucro).toFixed(0)}` : `-R$${parseFloat(a.valor).toFixed(0)}`}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--text2)' }}>apostado: R${parseFloat(a.valor).toFixed(0)}</p>
                  <button onClick={() => excluirAposta(a.id, a)} style={{ fontSize: 10, color: 'var(--text2)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>excluir</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NOVA APOSTA */}
      {abaAtiva === 'registrar' && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 14, padding: 16 }}>
          <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: 1, marginBottom: 14 }}>REGISTRAR APOSTA</p>

          {[
            ['Jogo (ex: Talleres vs Lanús)', 'jogo', 'text', 'Talleres vs Lanús'],
            ['Data', 'data', 'date', ''],
          ].map(([label, key, type, ph]) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{label}</p>
              <input type={type} value={form[key]} placeholder={ph} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', background: 'var(--bg3)', border: '1px solid var(--borda)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }} />
            </div>
          ))}

          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Mercado</p>
            <select value={form.mercado} onChange={e => setForm(f => ({ ...f, mercado: e.target.value }))}
              style={{ width: '100%', padding: '9px 12px', background: 'var(--bg3)', border: '1px solid var(--borda)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}>
              {MERCADOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            {[['Odd decimal', 'odd', '2.42'], ['Valor apostado (R$)', 'valor', '25']].map(([label, key, ph]) => (
              <div key={key}>
                <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{label}</p>
                <input type="number" step="0.01" value={form[key]} placeholder={ph} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--bg3)', border: '1px solid var(--borda)', borderRadius: 8, color: 'var(--text)', fontSize: 14, fontFamily: 'monospace', textAlign: 'center' }} />
              </div>
            ))}
          </div>

          {/* Preview lucro/perda */}
          {form.odd && form.valor && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: 'var(--verde-ev)', marginBottom: 2 }}>Se ganhar</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--verde-ev)', fontFamily: 'monospace' }}>+R${(parseFloat(form.valor || 0) * (parseFloat(form.odd || 1) - 1)).toFixed(0)}</p>
              </div>
              <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                <p style={{ fontSize: 10, color: 'var(--vermelho)', marginBottom: 2 }}>Se perder</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--vermelho)', fontFamily: 'monospace' }}>-R${parseFloat(form.valor || 0).toFixed(0)}</p>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>Resultado</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['ganhou', 'Ganhou ✓', 'var(--verde-ev)', 'rgba(22,163,74,0.15)'], ['perdeu', 'Perdeu ✗', 'var(--vermelho)', 'rgba(220,38,38,0.1)']].map(([v, l, cor, bg]) => (
                <button key={v} onClick={() => setForm(f => ({ ...f, resultado: v }))} style={{
                  flex: 1, padding: '10px', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  background: form.resultado === v ? bg : 'var(--bg3)',
                  border: `1px solid ${form.resultado === v ? cor : 'var(--borda)'}`,
                  color: form.resultado === v ? cor : 'var(--text2)'
                }}>{l}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Nota (opcional)</p>
            <input value={form.nota} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))} placeholder="Ex: gol de pênalti no fim..."
              style={{ width: '100%', padding: '9px 12px', background: 'var(--bg3)', border: '1px solid var(--borda)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }} />
          </div>

          <button onClick={registrarAposta} disabled={salvando || !form.jogo || !form.odd || !form.valor}
            style={{ width: '100%', padding: '13px', background: !form.jogo || !form.odd || !form.valor ? 'var(--bg3)' : 'var(--verde)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {salvando ? 'Salvando...' : 'Registrar aposta'}
          </button>
        </div>
      )}
    </div>
  )
}
