import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { riscoRuina, calcularEV, kelly } from '../lib/modelos'

const MERCADOS = ['1x2 Casa', '1x2 Empate', '1x2 Fora', 'Mais de 2.5', 'Menos de 2.5', 'BTTS Sim', 'BTTS Não', 'Handicap', 'Outro']
const CASAS = ['Betano', 'Bet365', 'KTO', 'Pinnacle', 'SportingBet', 'Betfair', 'Vaidebet', 'EstrelaBet', 'Outra']

function GraficoEvolucao({ apostas, bancaInicial }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || apostas.length === 0) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)
    let pontos = [{ x: 0, y: bancaInicial }]
    let banca = bancaInicial
    apostas.slice().reverse().forEach((a, i) => {
      banca += a.resultado === 'ganhou' ? parseFloat(a.lucro) : -parseFloat(a.valor)
      pontos.push({ x: i + 1, y: banca })
    })
    const minY = Math.min(...pontos.map(p => p.y), bancaInicial * 0.7)
    const maxY = Math.max(...pontos.map(p => p.y), bancaInicial * 1.3)
    const rangeY = maxY - minY || 1
    const pad = { t: 16, b: 24, l: 52, r: 16 }
    const W2 = W - pad.l - pad.r, H2 = H - pad.t - pad.b
    const toX = i => pad.l + (i / Math.max(pontos.length - 1, 1)) * W2
    const toY = v => pad.t + H2 - ((v - minY) / rangeY) * H2
    ctx.strokeStyle = 'rgba(134,239,172,0.08)'; ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) { const y = pad.t + (i / 4) * H2; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke() }
    const yRef = toY(bancaInicial)
    ctx.strokeStyle = 'rgba(234,179,8,0.3)'; ctx.setLineDash([4, 4])
    ctx.beginPath(); ctx.moveTo(pad.l, yRef); ctx.lineTo(W - pad.r, yRef); ctx.stroke(); ctx.setLineDash([])
    const ultima = pontos[pontos.length - 1].y
    const cor = ultima >= bancaInicial ? '#22c55e' : '#ef4444'
    ctx.beginPath()
    pontos.forEach((p, i) => i === 0 ? ctx.moveTo(toX(i), toY(p.y)) : ctx.lineTo(toX(i), toY(p.y)))
    ctx.lineTo(toX(pontos.length - 1), H - pad.b); ctx.lineTo(pad.l, H - pad.b); ctx.closePath()
    ctx.fillStyle = ultima >= bancaInicial ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)'; ctx.fill()
    ctx.beginPath(); ctx.strokeStyle = cor; ctx.lineWidth = 2; ctx.lineJoin = 'round'
    pontos.forEach((p, i) => i === 0 ? ctx.moveTo(toX(i), toY(p.y)) : ctx.lineTo(toX(i), toY(p.y))); ctx.stroke()
    pontos.forEach((p, i) => { ctx.beginPath(); ctx.arc(toX(i), toY(p.y), 3, 0, Math.PI * 2); ctx.fillStyle = cor; ctx.fill() })
    ctx.fillStyle = 'rgba(134,239,172,0.5)'; ctx.font = '10px monospace'; ctx.textAlign = 'right'
    for (let i = 0; i <= 4; i++) { const v = minY + (rangeY * (4 - i) / 4); ctx.fillText('R$' + v.toFixed(0), pad.l - 4, pad.t + (i / 4) * H2 + 4) }
  }, [apostas, bancaInicial])
  if (apostas.length === 0) return <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontSize: 13 }}>Registre apostas para ver o gráfico</div>
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
    data: new Date().toISOString().slice(0, 10), nota: '',
    casa_aposta: 'Betano', ev_percent: '', foi_ev_plus: false
  })

  useEffect(() => { carregar() }, [session])

  const carregar = async () => {
    try {
      const { data: perfil } = await supabase.from('profiles').select('banca_inicial,banca_atual').eq('id', session.user.id).single()
      if (perfil?.banca_inicial) setBancaInicial(perfil.banca_inicial)
      if (perfil?.banca_atual) setBancaAtual(perfil.banca_atual)
      const { data: aps } = await supabase.from('apostas').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(100)
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
      odd, valor, resultado: form.resultado, lucro, data: form.data, nota: form.nota,
      casa_aposta: form.casa_aposta,
      ev_percent: form.ev_percent ? parseFloat(form.ev_percent) : null,
      foi_ev_plus: form.foi_ev_plus
    }
    const { data } = await supabase.from('apostas').insert(aposta).select().single()
    if (data) {
      setApostas(prev => [data, ...prev])
      setBancaAtual(novaBanca)
      await supabase.from('profiles').upsert({ id: session.user.id, banca_atual: novaBanca })
      setForm(f => ({ ...f, jogo: '', odd: '', valor: '', nota: '', ev_percent: '', foi_ev_plus: false }))
      setAbaAtiva('painel')
    }
    setSalvando(false)
  }

  const excluirAposta = async (id, a) => {
    await supabase.from('apostas').delete().eq('id', id)
    const reverso = a.resultado === 'ganhou' ? -parseFloat(a.lucro) : parseFloat(a.valor)
    const novaBanca = bancaAtual + reverso
    setBancaAtual(novaBanca)
    await supabase.from('profiles').upsert({ id: session.user.id, banca_atual: novaBanca })
    setApostas(prev => prev.filter(x => x.id !== id))
  }

  // Stats
  const ganhos = apostas.filter(a => a.resultado === 'ganhou')
  const perdas = apostas.filter(a => a.resultado === 'perdeu')
  const taxaAcerto = apostas.length > 0 ? (ganhos.length / apostas.length * 100).toFixed(1) : 0
  const lucroTotal = ganhos.reduce((s, a) => s + parseFloat(a.lucro), 0) - perdas.reduce((s, a) => s + parseFloat(a.valor), 0)
  const volTotal = apostas.reduce((s, a) => s + parseFloat(a.valor), 0)
  const roi = volTotal > 0 ? (lucroTotal / volTotal * 100).toFixed(1) : 0
  const oddMedia = apostas.length > 0 ? (apostas.reduce((s, a) => s + parseFloat(a.odd), 0) / apostas.length).toFixed(2) : '-'
  const evPlusCount = apostas.filter(a => a.foi_ev_plus).length
  const evPlusAcerto = apostas.filter(a => a.foi_ev_plus && a.resultado === 'ganhou').length
  const saudePct = (bancaAtual / bancaInicial * 100).toFixed(1)
  const corSaude = bancaAtual >= bancaInicial ? 'var(--verde-ev)' : bancaAtual >= bancaInicial * 0.7 ? 'var(--ouro)' : 'var(--vermelho)'
  const rr = riscoRuina(bancaAtual, bancaAtual * 0.05, 0.05)

  // Sequências
  let maxSeqGanho = 0, maxSeqPerda = 0, seqAtual = 0, tipoSeq = null
  apostas.slice().reverse().forEach(a => {
    if (a.resultado === tipoSeq) seqAtual++
    else { seqAtual = 1; tipoSeq = a.resultado }
    if (tipoSeq === 'ganhou') maxSeqGanho = Math.max(maxSeqGanho, seqAtual)
    else maxSeqPerda = Math.max(maxSeqPerda, seqAtual)
  })

  if (carregando) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text2)' }}>Carregando...</div>

  return (
    <div style={{ padding: '20px 16px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => irPara('dashboard')} style={{ background: 'var(--bg2)', border: '1px solid var(--borda)', borderRadius: 8, padding: '8px 12px', color: 'var(--text2)', fontSize: 14 }}>←</button>
        <div><h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Gestão de Banca</h1><p style={{ fontSize: 12, color: 'var(--text2)' }}>{apostas.length} apostas registradas</p></div>
        <button onClick={() => setAbaAtiva('registrar')} style={{ marginLeft: 'auto', padding: '8px 16px', background: 'var(--ouro)', border: 'none', borderRadius: 10, color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Registrar</button>
      </div>

      <div style={{ display: 'flex', gap: 4, background: 'var(--bg2)', borderRadius: 10, padding: 4, marginBottom: 14, border: '1px solid var(--borda)' }}>
        {[['painel','Painel'],['historico','Histórico'],['registrar','Nova aposta']].map(([v,l]) => (
          <button key={v} onClick={() => setAbaAtiva(v)} style={{ flex:1, padding:'7px', fontSize:12, fontWeight:500, borderRadius:7, border:'none', cursor:'pointer', background: abaAtiva===v?'var(--bg3)':'transparent', color: abaAtiva===v?'var(--text)':'var(--text2)' }}>{l}</button>
        ))}
      </div>

      {abaAtiva === 'painel' && (
        <>
          {/* Cards principais */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            {[
              { l:'Banca atual', v:`R$${bancaAtual.toFixed(0)}`, c:corSaude },
              { l:'Resultado total', v:`${lucroTotal>=0?'+':''}R$${lucroTotal.toFixed(0)}`, c:lucroTotal>=0?'var(--verde-ev)':'var(--vermelho)' },
              { l:'Taxa de acerto', v:`${taxaAcerto}%`, c:parseFloat(taxaAcerto)>=55?'var(--verde-ev)':'var(--ouro)' },
              { l:'ROI', v:`${roi}%`, c:parseFloat(roi)>=0?'var(--verde-ev)':'var(--vermelho)' },
              { l:'Odd média', v:oddMedia, c:'var(--text)' },
              { l:'Apostas EV+', v:`${evPlusCount} (${evPlusCount>0?(evPlusAcerto/evPlusCount*100).toFixed(0):0}% acerto)`, c:'var(--ouro)' },
            ].map(c => (
              <div key={c.l} style={{ background:'var(--bg2)', border:'1px solid var(--borda)', borderRadius:12, padding:'12px 14px' }}>
                <p style={{ fontSize:11, color:'var(--text2)', marginBottom:4 }}>{c.l}</p>
                <p style={{ fontSize:18, fontWeight:700, fontFamily:'monospace', color:c.c }}>{c.v}</p>
              </div>
            ))}
          </div>

          {/* Saúde */}
          <div style={{ background:'var(--bg2)', border:'1px solid var(--borda)', borderRadius:12, padding:'14px 16px', marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:12, color:'var(--text2)' }}>Saúde da banca</span>
              <span style={{ fontSize:12, fontWeight:700, color:corSaude }}>{saudePct}%</span>
            </div>
            <div style={{ height:8, background:'var(--bg3)', borderRadius:4, overflow:'hidden', marginBottom:8 }}>
              <div style={{ height:'100%', width:`${Math.min(100,saudePct)}%`, background:corSaude, borderRadius:4, transition:'width .5s' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text2)' }}>
              <span>Inicial: R${bancaInicial}</span>
              <span>Seq. ganhos: {maxSeqGanho} · Seq. perdas: {maxSeqPerda}</span>
              <span style={{ color:rr<0.05?'var(--verde-ev)':'var(--vermelho)' }}>Risco ruína: {(rr*100).toFixed(1)}%</span>
            </div>
          </div>

          {/* Gráfico */}
          <div style={{ background:'var(--bg2)', border:'1px solid var(--borda)', borderRadius:12, padding:'14px 16px', marginBottom:10 }}>
            <p style={{ fontSize:11, color:'var(--text2)', fontWeight:600, letterSpacing:1, marginBottom:10 }}>EVOLUÇÃO DA BANCA</p>
            <GraficoEvolucao apostas={apostas} bancaInicial={bancaInicial} />
          </div>

          {/* Distribuição */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
            {[{l:'Ganhos',v:ganhos.length,c:'var(--verde-ev)'},{l:'Perdas',v:perdas.length,c:'var(--vermelho)'},{l:'Total',v:apostas.length,c:'var(--text)'}].map(s => (
              <div key={s.l} style={{ background:'var(--bg2)', border:'1px solid var(--borda)', borderRadius:10, padding:10, textAlign:'center' }}>
                <p style={{ fontSize:10, color:'var(--text2)', marginBottom:3 }}>{s.l}</p>
                <p style={{ fontSize:22, fontWeight:700, color:s.c }}>{s.v}</p>
              </div>
            ))}
          </div>

          {/* Alerta */}
          {bancaAtual < bancaInicial * 0.7 && (
            <div style={{ background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:12, padding:14, marginBottom:10 }}>
              <p style={{ fontSize:12, color:'var(--vermelho)', fontWeight:700, marginBottom:4 }}>🚨 Banca abaixo de 70% — reduza as apostas</p>
              <p style={{ fontSize:12, color:'var(--text2)' }}>Aposte no máximo 2% da banca atual até recuperar. Kelly ¼ recomendado: R${(bancaAtual*0.005).toFixed(0)} por aposta.</p>
            </div>
          )}

          {/* Ajuste banca */}
          <div style={{ background:'var(--bg2)', border:'1px solid var(--borda)', borderRadius:12, padding:14, marginTop:8 }}>
            <p style={{ fontSize:11, color:'var(--text2)', marginBottom:8 }}>Ajustar banca inicial</p>
            <div style={{ display:'flex', gap:8 }}>
              <input type="number" value={bancaInicial} onChange={e => setBancaInicial(parseFloat(e.target.value))}
                style={{ flex:1, padding:'8px 10px', background:'var(--bg3)', border:'1px solid var(--borda)', borderRadius:8, color:'var(--text)', fontSize:14, fontFamily:'monospace' }} />
              <button onClick={salvarBanca} disabled={salvando} style={{ padding:'8px 16px', background:'var(--verde)', border:'none', borderRadius:8, color:'#fff', fontSize:13, cursor:'pointer' }}>
                {salvando?'...':'Salvar'}
              </button>
            </div>
          </div>
        </>
      )}

      {abaAtiva === 'historico' && (
        <div>
          {apostas.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text2)' }}>
              <p style={{ fontSize:32, marginBottom:8 }}>📋</p><p>Nenhuma aposta registrada ainda</p>
            </div>
          ) : apostas.map(a => (
            <div key={a.id} style={{ background:'var(--bg2)', border:`1px solid ${a.resultado==='ganhou'?'rgba(22,163,74,0.25)':'rgba(220,38,38,0.2)'}`, borderRadius:12, padding:'12px 14px', marginBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{a.jogo}</p>
                    {a.foi_ev_plus && <span style={{ fontSize:10, padding:'1px 6px', borderRadius:10, background:'rgba(234,179,8,0.15)', color:'var(--ouro)' }}>EV+</span>}
                  </div>
                  <p style={{ fontSize:11, color:'var(--text2)' }}>{a.mercado} · Odd {parseFloat(a.odd).toFixed(2)} · {a.casa_aposta || ''} · {a.data}</p>
                  {a.ev_percent && <p style={{ fontSize:11, color:'var(--ouro)', marginTop:2 }}>EV: {a.ev_percent>0?'+':''}{a.ev_percent}%</p>}
                  {a.nota && <p style={{ fontSize:11, color:'var(--text2)', marginTop:2, fontStyle:'italic' }}>{a.nota}</p>}
                </div>
                <div style={{ textAlign:'right', marginLeft:12 }}>
                  <p style={{ fontSize:16, fontWeight:700, fontFamily:'monospace', color:a.resultado==='ganhou'?'var(--verde-ev)':'var(--vermelho)' }}>
                    {a.resultado==='ganhou'?`+R$${parseFloat(a.lucro).toFixed(0)}`:`-R$${parseFloat(a.valor).toFixed(0)}`}
                  </p>
                  <p style={{ fontSize:10, color:'var(--text2)' }}>stake: R${parseFloat(a.valor).toFixed(0)}</p>
                  <button onClick={() => excluirAposta(a.id,a)} style={{ fontSize:10, color:'var(--text2)', background:'none', border:'none', cursor:'pointer', marginTop:4 }}>excluir</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {abaAtiva === 'registrar' && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--borda)', borderRadius:14, padding:16 }}>
          <p style={{ fontSize:11, color:'var(--text3)', fontWeight:600, letterSpacing:1, marginBottom:14 }}>REGISTRAR APOSTA</p>

          <div style={{ marginBottom:10 }}>
            <p style={{ fontSize:11, color:'var(--text2)', marginBottom:4 }}>Jogo</p>
            <input value={form.jogo} onChange={e => setForm(f=>({...f,jogo:e.target.value}))} placeholder="Ex: Talleres vs Lanús"
              style={{ width:'100%', padding:'9px 12px', background:'var(--bg3)', border:'1px solid var(--borda)', borderRadius:8, color:'var(--text)', fontSize:13 }} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <p style={{ fontSize:11, color:'var(--text2)', marginBottom:4 }}>Mercado</p>
              <select value={form.mercado} onChange={e => setForm(f=>({...f,mercado:e.target.value}))}
                style={{ width:'100%', padding:'9px 12px', background:'var(--bg3)', border:'1px solid var(--borda)', borderRadius:8, color:'var(--text)', fontSize:13 }}>
                {MERCADOS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <p style={{ fontSize:11, color:'var(--text2)', marginBottom:4 }}>Casa de apostas</p>
              <select value={form.casa_aposta} onChange={e => setForm(f=>({...f,casa_aposta:e.target.value}))}
                style={{ width:'100%', padding:'9px 12px', background:'var(--bg3)', border:'1px solid var(--borda)', borderRadius:8, color:'var(--text)', fontSize:13 }}>
                {CASAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
            {[['Odd','odd','2.42'],['Valor (R$)','valor','25'],['EV% (opcional)','ev_percent','']].map(([l,k,ph]) => (
              <div key={k}>
                <p style={{ fontSize:11, color:'var(--text2)', marginBottom:4 }}>{l}</p>
                <input type="number" step="0.01" value={form[k]} placeholder={ph} onChange={e => setForm(f=>({...f,[k]:e.target.value}))}
                  style={{ width:'100%', padding:'9px 10px', background:'var(--bg3)', border:'1px solid var(--borda)', borderRadius:8, color:'var(--text)', fontSize:13, fontFamily:'monospace', textAlign:'center' }} />
              </div>
            ))}
          </div>

          <div style={{ marginBottom:10 }}>
            <p style={{ fontSize:11, color:'var(--text2)', marginBottom:4 }}>Data</p>
            <input type="date" value={form.data} onChange={e => setForm(f=>({...f,data:e.target.value}))}
              style={{ width:'100%', padding:'9px 12px', background:'var(--bg3)', border:'1px solid var(--borda)', borderRadius:8, color:'var(--text)', fontSize:13 }} />
          </div>

          {/* EV+ toggle */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, padding:'10px 12px', background:'rgba(234,179,8,0.08)', borderRadius:8, border:'1px solid rgba(234,179,8,0.2)' }}>
            <input type="checkbox" id="ev-plus" checked={form.foi_ev_plus} onChange={e => setForm(f=>({...f,foi_ev_plus:e.target.checked}))} style={{ width:16, height:16 }} />
            <label htmlFor="ev-plus" style={{ fontSize:13, color:'var(--ouro)', cursor:'pointer' }}>Esta aposta foi identificada como EV+ pelo app</label>
          </div>

          {/* Preview */}
          {form.odd && form.valor && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
              <div style={{ background:'rgba(22,163,74,0.1)', border:'1px solid rgba(22,163,74,0.3)', borderRadius:8, padding:10, textAlign:'center' }}>
                <p style={{ fontSize:10, color:'var(--verde-ev)', marginBottom:2 }}>Se ganhar</p>
                <p style={{ fontSize:16, fontWeight:700, color:'var(--verde-ev)', fontFamily:'monospace' }}>+R${(parseFloat(form.valor||0)*(parseFloat(form.odd||1)-1)).toFixed(0)}</p>
              </div>
              <div style={{ background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:8, padding:10, textAlign:'center' }}>
                <p style={{ fontSize:10, color:'var(--vermelho)', marginBottom:2 }}>Se perder</p>
                <p style={{ fontSize:16, fontWeight:700, color:'var(--vermelho)', fontFamily:'monospace' }}>-R${parseFloat(form.valor||0).toFixed(0)}</p>
              </div>
            </div>
          )}

          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:11, color:'var(--text2)', marginBottom:6 }}>Resultado</p>
            <div style={{ display:'flex', gap:8 }}>
              {[['ganhou','Ganhou ✓','var(--verde-ev)','rgba(22,163,74,0.15)'],['perdeu','Perdeu ✗','var(--vermelho)','rgba(220,38,38,0.1)']].map(([v,l,cor,bg]) => (
                <button key={v} onClick={() => setForm(f=>({...f,resultado:v}))} style={{ flex:1, padding:'10px', borderRadius:10, fontWeight:600, fontSize:13, cursor:'pointer', background:form.resultado===v?bg:'var(--bg3)', border:`1px solid ${form.resultado===v?cor:'var(--borda)'}`, color:form.resultado===v?cor:'var(--text2)' }}>{l}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:14 }}>
            <p style={{ fontSize:11, color:'var(--text2)', marginBottom:4 }}>Nota (opcional)</p>
            <input value={form.nota} onChange={e => setForm(f=>({...f,nota:e.target.value}))} placeholder="Ex: gol de pênalti no fim, jogo travado..."
              style={{ width:'100%', padding:'9px 12px', background:'var(--bg3)', border:'1px solid var(--borda)', borderRadius:8, color:'var(--text)', fontSize:13 }} />
          </div>

          <button onClick={registrarAposta} disabled={salvando || !form.jogo || !form.odd || !form.valor}
            style={{ width:'100%', padding:'13px', background:(!form.jogo||!form.odd||!form.valor)?'var(--bg3)':'var(--verde)', border:'none', borderRadius:10, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
            {salvando?'Salvando...':'Registrar aposta'}
          </button>
        </div>
      )}
    </div>
  )
}
