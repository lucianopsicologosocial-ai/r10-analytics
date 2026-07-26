/**
 * R10 Analytics — Motor Matemático
 * Todas as fórmulas de probabilidade, EV e gestão de banca
 */

// ─────────────────────────────────────────────
// 1. CONVERSÃO DE ODDS
// ─────────────────────────────────────────────

/** Odds decimais (ex: 2.5) → probabilidade implícita (0 a 1) */
export const oddsParaProb = odds => 1 / odds

/** Probabilidade (0 a 1) → odds decimais */
export const probParaOdds = prob => 1 / prob

/** Odds americanas (+150, -200) → decimais */
export const americanaParaDecimal = americana => {
  if (americana > 0) return (americana / 100) + 1
  return (100 / Math.abs(americana)) + 1
}

/** Remover margem da casa (vig) de um par de odds */
export const removerVig = (odds1, odds2) => {
  const p1_impl = oddsParaProb(odds1)
  const p2_impl = oddsParaProb(odds2)
  const soma = p1_impl + p2_impl // > 1 por causa da margem
  return {
    p1_real: p1_impl / soma,
    p2_real: p2_impl / soma,
    margem: ((soma - 1) / soma * 100).toFixed(2) + '%'
  }
}


/**
 * Remover margem da casa de mercado 1X2 (três resultados)
 * Mais preciso para futebol
 */
export const removerVig3 = (o1, ox, o2) => {
  const p1 = 1/o1, px = 1/ox, p2 = 1/o2
  const soma = p1 + px + p2
  return {
    p1_real: p1/soma,
    px_real: px/soma,
    p2_real: p2/soma,
    margem: ((soma - 1) * 100).toFixed(2) + '%',
    margem_num: (soma - 1) * 100,
    eh_alta: (soma - 1) > 0.07
  }
}

// ─────────────────────────────────────────────
// 2. VALOR ESPERADO (EV)
// ─────────────────────────────────────────────

/**
 * EV = (p_ganho × lucro) - (p_perda × stake)
 * EV > 0 → aposta tem valor (favorável a longo prazo)
 * EV < 0 → casa tem vantagem
 * @param {number} probReal - probabilidade real estimada (0-1)
 * @param {number} odds - odds decimais oferecidas pela casa
 * @param {number} stake - valor apostado (R$)
 */
export const calcularEV = (probReal, odds, stake = 100) => {
  const lucro = (odds - 1) * stake
  const perda = stake
  const ev = (probReal * lucro) - ((1 - probReal) * perda)
  const evPercent = (ev / stake * 100)
  return {
    ev: ev.toFixed(2),
    evPercent: evPercent.toFixed(2), // número como string SEM %, ex: '20.00'
    positivo: ev > 0,
    classificacao: ev > 0 ? 'EV+' : ev < -5 ? 'EV-' : 'Neutro'
  }
}

// ─────────────────────────────────────────────
// 3. CRITÉRIO DE KELLY
// ─────────────────────────────────────────────

/**
 * Kelly = (p × b - q) / b
 * p = probabilidade real de ganho
 * q = probabilidade real de perda (1-p)
 * b = odds decimais - 1 (lucro por unidade apostada)
 * Retorna a fração da banca a apostar
 * Kelly fracionário: usar 1/4 ou 1/2 do Kelly para segurança
 */
export const kelly = (probReal, odds, fracao = 0.25) => {
  const b = odds - 1
  const p = probReal
  const q = 1 - p
  const k = (p * b - q) / b
  if (k <= 0) return { kelly: '0.0%', kelly_fracionario: '0.0%', sinal: 'sem_valor', mensagem: 'EV negativo — não apostar nesta odd' }
  return {
    kelly: (k * 100).toFixed(1) + '%',
    kelly_fracionario: (k * fracao * 100).toFixed(1) + '%',
    fator: fracao,
    sinal: k > 0.15 ? 'alto' : k > 0.05 ? 'moderado' : 'baixo'
  }
}

/**
 * Tamanho da aposta em R$ baseado no Kelly
 * @param {number} banca - banca total em R$
 * @param {number} probReal - probabilidade real
 * @param {number} odds - odds decimais
 * @param {number} fracao - Kelly fracionário (padrão 0.25 = 1/4)
 */
export const apostaKelly = (banca, probReal, odds, fracao = 0.25) => {
  const k = kelly(probReal, odds, fracao)
  const percentual = parseFloat(k.kelly_fracionario) / 100
  const valor = banca * percentual
  return {
    ...k,
    valorAposta: valor.toFixed(2),
    percentualBanca: k.kelly_fracionario
  }
}

// ─────────────────────────────────────────────
// 4. ANÁLISE DE JOGADOR
// ─────────────────────────────────────────────

/**
 * Calcular probabilidade de gol baseada em estatísticas
 * @param {object} stats - estatísticas do jogador
 */
export const probGolJogador = stats => {
  // Validação defensiva — stats pode ser undefined ou incompleto
  if (!stats || typeof stats !== 'object') return 0.25 // valor padrão conservador

  const base = parseFloat(stats.gols_por_jogo) || 0.3 // média de atacante
  const ajuste_forma = parseFloat(stats.forma_recente) || 1.0
  const taxa_conversao = parseFloat(stats.taxa_conversao) || 0.2
  const lesionado = stats.lesionado === true

  if (lesionado) return 0 // jogador lesionado: P=0

  // P(gol) = 1 - e^(-λ) — distribuição de Poisson
  // λ = gols esperados, ajustado por forma e eficiência recente
  const lambda = Math.max(0, base * ajuste_forma)
  const prob = 1 - Math.exp(-lambda)

  return Math.min(0.95, Math.max(0.02, prob))
}

/**
 * Probabilidade sequencial para eventos independentes
 * P_seq = P₁ × P₂ × ... × Pₙ
 */
export const probSequencial = (...probs) => probs.reduce((acc, p) => acc * p, 1)

/**
 * Desvio padrão e classificação do jogador vs. média
 */
export const classificarJogador = (valor, media, dp) => {
  const z = (valor - media) / dp
  const percentil = Math.round(normCDF(z) * 100)
  return {
    z_score: z.toFixed(2),
    percentil,
    classificacao: percentil >= 90 ? 'Elite' : percentil >= 75 ? 'Acima da média' : percentil >= 50 ? 'Médio' : 'Abaixo da média'
  }
}

// CDF normal aproximada (Abramowitz & Stegun)
const normCDF = z => {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp(-z * z / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))))
  return z > 0 ? 1 - p : p
}

// ─────────────────────────────────────────────
// 5. GESTÃO DE BANCA
// ─────────────────────────────────────────────

/**
 * Calcular risco de ruína
 * Aproximação: R = ((1-vantagem)/(1+vantagem))^(banca/aposta)
 */
export const riscoRuina = (banca, apostaMedia, vantagem) => {
  if (vantagem <= 0) return 1.0
  const q = (1 - vantagem) / (1 + vantagem)
  const n = banca / apostaMedia
  return Math.pow(q, n)
}

/**
 * Estratégia de recuperação matemática (anti-martingale seguro)
 * Não dobra apostas — usa Kelly fracionário na banca atual
 */
export const planoRecuperacao = (banca_inicial, banca_atual, prob_media, odds_media) => {
  const perda = banca_inicial - banca_atual
  const percentual_perdido = perda / banca_inicial

  // Kelly na banca atual (não na inicial!)
  const k = kelly(prob_media, odds_media, 0.25)
  const aposta_segura = banca_atual * (parseFloat(k.kelly_fracionario) / 100)

  // Número de apostas necessárias para recuperar (com EV+ assumido)
  const ev = calcularEV(prob_media, odds_media, aposta_segura)
  const apostas_estimadas = perda / (parseFloat(ev.ev))

  return {
    perda_total: perda.toFixed(2),
    percentual_perdido: (percentual_perdido * 100).toFixed(1) + '%',
    aposta_segura: aposta_segura.toFixed(2),
    apostas_estimadas: Math.ceil(apostas_estimadas),
    alerta: percentual_perdido > 0.5 ? 'CRÍTICO: Mais de 50% da banca perdida. Parar.' : 
            percentual_perdido > 0.3 ? 'ATENÇÃO: Reduzir apostas significativamente.' : 
            'OK: Recuperação gradual possível.'
  }
}

// ─────────────────────────────────────────────
// 6. ODDS JUSTAS vs. CASA
// ─────────────────────────────────────────────

/**
 * Detectar se há valor em uma aposta
 * Compara probabilidade real estimada vs. implícita na odd
 */
export const detectarValor = (prob_real, odds_casa) => {
  const prob_implicita = oddsParaProb(odds_casa)
  const vantagem = prob_real - prob_implicita
  const ev = calcularEV(prob_real, odds_casa)
  
  return {
    prob_real: (prob_real * 100).toFixed(1) + '%',
    prob_implicita: (prob_implicita * 100).toFixed(1) + '%',
    vantagem: (vantagem * 100).toFixed(1) + '%',
    tem_valor: vantagem > 0.03, // margem mínima de 3% para considerar EV+
    ev: ev.evPercent + '%',
    classificacao: vantagem > 0.1 ? '🔥 Forte EV+' : vantagem > 0.03 ? '✅ EV+' : vantagem > -0.03 ? '⚪ Neutro' : '❌ EV-'
  }
}
