/**
 * R10 Analytics — Integração APIs de Esportes
 * API-Football: https://www.api-football.com (100 req/dia grátis)
 * TheSportsDB: https://www.thesportsdb.com (open source)
 * Chamadas via /api/esportes para não expor keys no front
 */

const BASE = '/api/esportes'

// ─── Jogadores ───────────────────────────────

/** Buscar jogador por nome */
export const buscarJogador = async nome => {
  const res = await fetch(`${BASE}/jogador?nome=${encodeURIComponent(nome)}`)
  return res.json()
}

/** Estatísticas detalhadas de um jogador */
export const statsJogador = async (jogadorId, temporada = 2024) => {
  const res = await fetch(`${BASE}/stats?id=${jogadorId}&temporada=${temporada}`)
  return res.json()
}

/** Últimos jogos de um jogador (forma recente) */
export const formaRecente = async (jogadorId, ultimos = 5) => {
  const res = await fetch(`${BASE}/forma?id=${jogadorId}&n=${ultimos}`)
  return res.json()
}

// ─── Partidas ─────────────────────────────────

/** Próximas partidas de um time */
export const proximasPartidas = async (timeId, n = 5) => {
  const res = await fetch(`${BASE}/partidas?time=${timeId}&tipo=proximas&n=${n}`)
  return res.json()
}

/** Partidas ao vivo */
export const partidasAoVivo = async () => {
  const res = await fetch(`${BASE}/ao-vivo`)
  return res.json()
}

/** Estatísticas de uma partida ao vivo */
export const statsPartidaAoVivo = async (partidaId) => {
  const res = await fetch(`${BASE}/ao-vivo/stats?partida=${partidaId}`)
  return res.json()
}

// ─── Odds ─────────────────────────────────────

/** Odds atuais de uma partida */
export const oddsPartida = async (partidaId) => {
  const res = await fetch(`${BASE}/odds?partida=${partidaId}`)
  return res.json()
}

// ─── Cache local (evitar gastar requisições) ──

const CACHE = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

export const comCache = async (chave, fn) => {
  const agora = Date.now()
  if (CACHE.has(chave)) {
    const { dados, ts } = CACHE.get(chave)
    if (agora - ts < CACHE_TTL) return dados
  }
  const dados = await fn()
  CACHE.set(chave, { dados, ts: agora })
  return dados
}

// ─── Dados mock para desenvolvimento (sem API key) ──

export const JOGADORES_MOCK = [
  {
    id: 276,
    nome: 'Neymar Jr.',
    time: 'Al Hilal',
    posicao: 'Atacante',
    foto: null,
    stats: {
      gols_por_jogo: 0.68,
      assistencias_pg: 0.42,
      chutes_ao_gol_pg: 2.3,
      taxa_conversao: 0.29,
      dribles_pg: 4.1,
      forma_recente: 0.85,
      jogos_temporada: 28,
      gols_total: 19,
      lesionado: false
    }
  },
  {
    id: 874,
    nome: 'Vinicius Jr.',
    time: 'Real Madrid',
    posicao: 'Atacante',
    foto: null,
    stats: {
      gols_por_jogo: 0.72,
      assistencias_pg: 0.38,
      chutes_ao_gol_pg: 3.1,
      taxa_conversao: 0.23,
      dribles_pg: 5.2,
      forma_recente: 1.15,
      jogos_temporada: 32,
      gols_total: 23,
      lesionado: false
    }
  },
  {
    id: 521,
    nome: 'Rodrygo',
    time: 'Real Madrid',
    posicao: 'Atacante',
    foto: null,
    stats: {
      gols_por_jogo: 0.45,
      assistencias_pg: 0.35,
      chutes_ao_gol_pg: 2.1,
      taxa_conversao: 0.21,
      dribles_pg: 2.8,
      forma_recente: 0.95,
      jogos_temporada: 30,
      gols_total: 13,
      lesionado: false
    }
  },
  {
    id: 1100,
    nome: 'Raphinha',
    time: 'Barcelona',
    posicao: 'Atacante',
    foto: null,
    stats: {
      gols_por_jogo: 0.58,
      assistencias_pg: 0.41,
      chutes_ao_gol_pg: 2.8,
      taxa_conversao: 0.21,
      dribles_pg: 3.4,
      forma_recente: 1.2,
      jogos_temporada: 34,
      gols_total: 20,
      lesionado: false
    }
  },
  {
    id: 299,
    nome: 'Endrick',
    time: 'Real Madrid',
    posicao: 'Atacante',
    foto: null,
    stats: {
      gols_por_jogo: 0.31,
      assistencias_pg: 0.12,
      chutes_ao_gol_pg: 1.4,
      taxa_conversao: 0.22,
      dribles_pg: 1.9,
      forma_recente: 1.05,
      jogos_temporada: 18,
      gols_total: 6,
      lesionado: false
    }
  }
]

export const PARTIDAS_MOCK = [
  {
    id: 'P001',
    home: 'Real Madrid',
    away: 'Barcelona',
    data: '2026-08-02T20:00:00',
    liga: 'La Liga',
    status: 'agendada',
    odds: { home: 2.10, draw: 3.40, away: 3.20 },
    jogadores_destaque: [874, 521]
  },
  {
    id: 'P002',
    home: 'Al Hilal',
    away: 'Al Nassr',
    data: '2026-08-03T18:00:00',
    liga: 'Saudi Pro League',
    status: 'agendada',
    odds: { home: 1.85, draw: 3.60, away: 4.10 },
    jogadores_destaque: [276]
  },
  {
    id: 'P003',
    home: 'Flamengo',
    away: 'Palmeiras',
    data: '2026-08-04T16:00:00',
    liga: 'Brasileirão',
    status: 'agendada',
    odds: { home: 2.30, draw: 3.10, away: 2.80 },
    jogadores_destaque: []
  }
]
