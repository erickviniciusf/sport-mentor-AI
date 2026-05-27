import { logger } from "../utils/logger.js";

/**
 * Formata um fator com alinhamento e cores blessed
 * @param {string} label - Descrição do fator
 * @param {number} value - Valor do bônus/penalidade
 * @returns {string} Linha formatada para blessed
 */
function formatFactor(label, value) {
  const sign = value >= 0 ? '+' : '';
  const color = value >= 15 ? 'green-fg' : value >= 5 ? 'yellow-fg' : value > 0 ? 'cyan-fg' : 'red-fg';
  
  return `  | ${label.padEnd(50)} | {${color}}${sign}${String(value).padStart(3)}{/${color}} |`;
}

/**
 * Formata a seção de recomendações de linha
 * @param {Array} recommendations - Array com { line, probability, color }
 * @returns {string} Bloco formatado
 */
function formatRecommendations(recommendations) {
  if (!recommendations || recommendations.length === 0) {
    return '  | Sem recomendações claras |';
  }

  let output = '\n  RECOMENDACOES DE LINHA:\n';
  
  recommendations.forEach(rec => {
    const probColor = rec.probability === 'SEGURO' ? 'green-fg' 
                    : rec.probability === 'PROVÁVEL' ? 'yellow-fg' 
                    : 'cyan-fg';
    
    output += `  | Over ${rec.line.padEnd(5)} | {${probColor}}${rec.probability}{/${probColor}} |\n`;
  });

  return output;
}

/**
 * Formata a seção de análise L10 de chutes
 * @param {Object} breakdown - Breakdown dos fatores
 * @returns {string} Bloco formatado
 */
function formatShotsAnalysis(breakdown) {
  if (!breakdown || !breakdown.volume) {
    return '';
  }

  const vol = breakdown.volume;
  const cons = breakdown.consistency;
  const xg = breakdown.xg;

  let output = '\n  ANALISE DE CHUTES (L10):\n';
  output += `  | Media de chutes (L10):             ${String(vol.average).padEnd(5)} por jogo |\n`;
  output += `  | Jogos com >= 1 shot:               ${String(cons.gamesWithShot).padEnd(5)}/10      |\n`;
  output += `  | Jogos com >= 2 shots:              ${String(cons.gamesWithTwoShots).padEnd(5)}/10      |\n`;
  output += `  | xG medio (L10):                    ${String(xg.average).padEnd(5)}          |\n`;

  return output;
}

/**
 * Cria breakdown textual resumido para analise.js
 * Exibe de forma compacta e direta
 * @param {Object} conviction - Objeto com score, breakdown, recommendations
 * @returns {string} Texto formatado para blessed
 */
function createSummaryForAnalysis(conviction) {
  const { score, breakdown, recommendations, playerName } = conviction;
  
  // Pega apenas os 3 principais fatores
  const mainFactors = [];
  
  if (breakdown.volume && breakdown.volume.value > 0) {
    mainFactors.push(`Volume: ${breakdown.volume.average} shots/jogo`);
  }
  if (breakdown.consistency && breakdown.consistency.value > 0) {
    mainFactors.push(`Consistencia: ${breakdown.consistency.gamesWithShot}/10 jogos`);
  }
  if (breakdown.xg && breakdown.xg.value > 0) {
    mainFactors.push(`xG: ${breakdown.xg.average}`);
  }

  const factorsText = mainFactors.join(' | ') || 'Análise em progresso';
  const recText = recommendations && recommendations.length > 0 
    ? `Recomendado: Over ${recommendations[0].line}` 
    : 'Ver detalhes';

  return `  Fatores: ${factorsText} | ${recText}`;
}

/**
 * Cria breakdown completo e formatado para tips.js (expandido)
 * Exibe tabela com alinhamento e cores
 * @param {Object} conviction - Objeto com score, breakdown, recommendations
 * @returns {string} Texto formatado e detalhado para blessed
 */
function createDetailedForTips(conviction) {
  const { 
    playerId, 
    playerName, 
    position, 
    market, 
    score, 
    breakdown, 
    recommendations, 
    explanation 
  } = conviction;

  const sep = '═'.repeat(80);
  const subSep = '─'.repeat(80);

  let output = `\n${sep}\n`;
  output += `{bold}${playerName.toUpperCase()} (${position}) | ${market.toUpperCase()} | ${score}/100{/bold}\n`;
  output += `${sep}\n\n`;

  // ===== SEÇÃO 1: FATORES =====
  output += `{bold}FATORES QUE IMPACTARAM:{/bold}\n`;
  output += `${subSep}\n`;

  // Starter
  if (breakdown.starter) {
    output += formatFactor('Starter confirmado', breakdown.starter.value) + '\n';
  }

  // Volume
  if (breakdown.volume) {
    output += formatFactor(
      `Volume historico (L10: ${breakdown.volume.average} shots/jogo)`,
      breakdown.volume.value
    ) + '\n';
  }

  // Consistência
  if (breakdown.consistency) {
    output += formatFactor(
      `Consistencia (${breakdown.consistency.gamesWithShot}/10 jogos com >= 1 shot)`,
      breakdown.consistency.value
    ) + '\n';
  }

  // xG
  if (breakdown.xg) {
    output += formatFactor(
      `xG elevado (${breakdown.xg.average} xG/jogo)`,
      breakdown.xg.value
    ) + '\n';
  }

  // Minutos
  if (breakdown.minutes) {
    output += formatFactor(
      `Minutos jogados (${breakdown.minutes.average} min/jogo)`,
      breakdown.minutes.value
    ) + '\n';
  }

  // Posição/Formação
  if (breakdown.formation) {
    output += formatFactor(
      `Posicao/Formacao (${breakdown.formation.position} em ${breakdown.formation.formation})`,
      breakdown.formation.value
    ) + '\n';
  }

  // Penalidade (se houver)
  if (breakdown.penalty) {
    output += formatFactor(
      `PENALIDADE: ${breakdown.penalty.reason}`,
      breakdown.penalty.value
    ) + '\n';
  }

  output += `${subSep}\n`;
  output += `  {bold}= ${score}/100 ({yellow-fg}${getScoreLabel(score)}{/yellow-fg}){/bold}\n\n`;

  // ===== SEÇÃO 2: ANÁLISE L10 =====
  output += `{bold}ANALISE L10 - ULTIMOS 10 JOGOS:{/bold}\n`;
  output += formatShotsAnalysis(breakdown);

  // ===== SEÇÃO 3: RECOMENDAÇÕES =====
  output += `{bold}RECOMENDACOES DE LINHA:{/bold}\n`;
  output += formatRecommendations(recommendations);

  // ===== SEÇÃO 4: EXPLICAÇÃO =====
  output += `\n${subSep}\n`;
  output += `{bold}RESUMO:{/bold}\n`;
  output += `${explanation}\n`;
  output += `${sep}\n`;

  return output;
}

/**
 * Retorna label de score
 * @param {number} score - Score de 0-100
 * @returns {string} Label descritivo
 */
export function getScoreLabel(score) {
  if (score >= 85) return 'ELITE';
  if (score >= 75) return 'STRONG';
  if (score >= 65) return 'GOOD';
  if (score >= 55) return 'FAIR';
  if (score >= 40) return 'NEUTRAL';
  return 'WEAK';
}

/**
 * Cria objeto estruturado de tip para armazenamento/processamento
 * @param {Object} conviction - Conviction do convictionEngine
 * @returns {Object} Tip estruturado
 */
function createTipObject(conviction) {
  return {
    playerId: conviction.playerId,
    playerName: conviction.playerName,
    position: conviction.position,
    market: conviction.market,
    score: conviction.score,
    breakdown: conviction.breakdown,
    recommendations: conviction.recommendations,
    explanation: conviction.explanation,
    // Versões formatadas
    summaryForAnalysis: createSummaryForAnalysis(conviction),
    detailedForTips: createDetailedForTips(conviction),
    // Metadata
    createdAt: new Date().toISOString(),
    scoreLabel: getScoreLabel(conviction.score)
  };
}

/**
 * Constrói tips a partir de convictions
 * Filtra por score >= 70 e retorna estruturado + formatado
 * @param {Array} convictions - Array de convictions do convictionEngine
 * @returns {Promise<Array>} Array de tips estruturados
 */
export async function buildTips(convictions) {
  try {
    // Filtra convictions com score >= 70
    const tipConvictions = convictions.filter(conviction => conviction.score >= 70);

    // Mapeia para objetos de tip estruturados
    const tips = tipConvictions.map(conviction => createTipObject(conviction));

    logger.info(`Tips gerados: ${tips.length} de ${convictions.length} convictions >= 70`);

    return tips;

  } catch (error) {
    logger.error('Erro ao construir tips', error);
    throw error;
  }
}

/**
 * Formata um tip para exibição rápida em uma linha (para analise.js)
 * @param {Object} tip - Objeto de tip
 * @returns {string} Linha formatada
 */
export function formatTipForQuickDisplay(tip) {
  const scoreColor = tip.score >= 85 ? 'green-fg' 
                   : tip.score >= 75 ? 'yellow-fg' 
                   : 'cyan-fg';
  
  return `{${scoreColor}}[TIP]{/${scoreColor}} ${tip.playerName.padEnd(20)} | ${tip.market.padEnd(8)} | ${String(tip.score).padStart(3)}/100 | ${tip.scoreLabel}`;
}

/**
 * Formata múltiplos tips para exibição rápida
 * @param {Array} tips - Array de tips
 * @returns {string} Bloco formatado
 */
export function formatTipsForQuickDisplay(tips) {
  if (!tips || tips.length === 0) {
    return '{red-fg}Nenhum tip gerado (< 70 conviction){/red-fg}';
  }

  const header = `{green-fg}{bold}TIPS GERADOS (${tips.length}){/bold}{/green-fg}`;
  const lines = tips.map(tip => formatTipForQuickDisplay(tip)).join('\n');

  return `${header}\n${lines}`;
}

/**
 * Retorna tip expandido formatado (para tips.js)
 * @param {Object} tip - Objeto de tip
 * @returns {string} Texto completo e detalhado
 */
export function formatTipExpandedForTipsScreen(tip) {
  return tip.detailedForTips;
}