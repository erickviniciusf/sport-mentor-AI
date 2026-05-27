import { logger } from '../utils/logger.js';

/**
 * Encontra um jogador na escalação (home ou away)
 * @param {Object} lineup - { home: {...}, away: {...} }
 * @param {number} playerId - ID do jogador procurado
 * @returns {Object|null} { id, name, position, team: 'home'|'away' }
 */
function findPlayerInLineup(lineup, playerId) {
  const homePlayer = lineup.home.starters.find(p => p.id === playerId);
  if (homePlayer) {
    return { ...homePlayer, team: 'home' };
  }

  const awayPlayer = lineup.away.starters.find(p => p.id === playerId);
  if (awayPlayer) {
    return { ...awayPlayer, team: 'away' };
  }

  return null;
}

/**
 * Encontra os stats de um jogador no array de stats
 * @param {Array} homeStats - Array de stats dos titulares do time da casa
 * @param {Array} awayStats - Array de stats dos titulares do time visitante
 * @param {Object} player - Objeto do jogador com team: 'home'|'away'
 * @param {Object} lineup - Escalação para correlacionar índices
 * @returns {Object|null} Stats do jogador (com results array de L10)
 */
function findPlayerStats(homeStats, awayStats, player, lineup) {
  const stats = player.team === 'home' ? homeStats : awayStats;
  const starters = player.team === 'home' ? lineup.home.starters : lineup.away.starters;

  const playerIndex = starters.findIndex(p => p.id === player.id);
  
  if (playerIndex === -1 || !stats[playerIndex]) {
    return null;
  }

  return stats[playerIndex];
}

/**
 * Calcula a média de um campo nos últimos N jogos (L10)
 * @param {Object} playerStats - Stats do jogador { results: [...] }
 * @param {string} field - Campo a calcular (ex: 'total_shots', 'expected_goals')
 * @param {number} lastGames - Últimos N jogos (padrão: 10)
 * @returns {number} Média arredondada a 2 casas decimais
 */
function calculateL10Average(playerStats, field, lastGames = 10) {
  if (!playerStats || !playerStats.results || playerStats.results.length === 0) {
    return 0;
  }

  const recentGames = playerStats.results.slice(-lastGames);
  const sum = recentGames.reduce((acc, game) => acc + (game[field] || 0), 0);
  
  return parseFloat((sum / recentGames.length).toFixed(2));
}

/**
 * Conta quantos dos últimos N jogos teve pelo menos X do campo
 * @param {Object} playerStats - Stats do jogador
 * @param {string} field - Campo (ex: 'total_shots')
 * @param {number} threshold - Mínimo para contar (default: 1)
 * @param {number} lastGames - Últimos N jogos (padrão: 10)
 * @returns {number} Quantidade de jogos que atingiram o threshold
 */
function countL10Consistency(playerStats, field, threshold = 1, lastGames = 10) {
  if (!playerStats || !playerStats.results || playerStats.results.length === 0) {
    return 0;
  }

  const recentGames = playerStats.results.slice(-lastGames);
  return recentGames.filter(game => (game[field] || 0) >= threshold).length;
}

/**
 * Calcula desvio padrão para medir consistência
 * @param {Object} playerStats - Stats do jogador
 * @param {string} field - Campo a analisar
 * @param {number} lastGames - Últimos N jogos
 * @returns {number} Desvio padrão
 */
function calculateStandardDeviation(playerStats, field, lastGames = 10) {
  if (!playerStats || !playerStats.results || playerStats.results.length === 0) {
    return 0;
  }

  const recentGames = playerStats.results.slice(-lastGames);
  const values = recentGames.map(game => game[field] || 0);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  
  return parseFloat(Math.sqrt(variance).toFixed(2));
}

/**
 * Recomenda linhas de chutes baseado em L10
 * @param {number} avgShots - Média de chutes nos últimos 10
 * @param {number} consistency - Quantos dos 10 jogos teve >= 1 shot
 * @param {Object} player - Dados do jogador
 * @param {string} formation - Formação do time
 * @returns {Object} { recommended: string, analysis: string }
 */
function recommendShotLines(avgShots, consistency, player, formation) {
  const recommendations = [];

  // Over +0.5 — quase sempre
  if (avgShots >= 0.5 || consistency >= 7) {
    recommendations.push({ line: '+0.5', probability: 'SEGURO', color: 'green' });
  } else if (consistency >= 5) {
    recommendations.push({ line: '+0.5', probability: 'PROVÁVEL', color: 'yellow' });
  }

  // Over +1.5 — se média >= 1.5
  if (avgShots >= 1.5 && consistency >= 6) {
    recommendations.push({ line: '+1.5', probability: 'PROVÁVEL', color: 'yellow' });
  } else if (avgShots >= 1.2) {
    recommendations.push({ line: '+1.5', probability: 'POSSÍVEL', color: 'cyan' });
  }

  // Over +2.5 — elite shooters
  if (avgShots >= 2.5 && consistency >= 7) {
    recommendations.push({ line: '+2.5', probability: 'POSSÍVEL', color: 'cyan' });
  }

  // Over +3.5 — raramente
  if (avgShots >= 3.2) {
    recommendations.push({ line: '+3.5', probability: 'POSSÍVEL', color: 'cyan' });
  }

  return recommendations;
}

/**
 * Calcula fatores positivos/negativos baseado no mercado SHOTS
 * @param {Object} playerStats - Stats do jogador (L10)
 * @param {Object} player - Dados do jogador
 * @param {string} formation - Formação do time
 * @returns {Object} { score: number, factors: Array, breakdown: Object }
 */
function calculateShotsFactors(playerStats, player, formation) {
  let score = 0;
  const factors = [];
  const breakdown = {};

  // ===== FATOR 1: STARTER CONFIRMADO (CRÍTICO) =====
  const starterBonus = 15;
  score += starterBonus;
  breakdown.starter = { value: starterBonus, reason: 'starter confirmado' };
  factors.push(`+ starter confirmado: +${starterBonus}`);

  // ===== FATOR 2: VOLUME HISTÓRICO L10 =====
  const avgShots = calculateL10Average(playerStats, 'total_shots', 10);
  let volumeBonus = 0;
  let volumeReason = '';

  if (avgShots >= 3.0) {
    volumeBonus = 25;
    volumeReason = `${avgShots} shots/jogo (alta produção)`;
  } else if (avgShots >= 2.0) {
    volumeBonus = 18;
    volumeReason = `${avgShots} shots/jogo (ofensivo)`;
  } else if (avgShots >= 1.2) {
    volumeBonus = 10;
    volumeReason = `${avgShots} shots/jogo (moderado)`;
  } else if (avgShots >= 0.5) {
    volumeBonus = 5;
    volumeReason = `${avgShots} shots/jogo (baixo)`;
  } else {
    volumeBonus = -10;
    volumeReason = `${avgShots} shots/jogo (muito baixo)`;
  }

  score += volumeBonus;
  breakdown.volume = { value: volumeBonus, average: avgShots, reason: volumeReason };
  factors.push(`| Volume (L10): ${avgShots} shots/jogo: ${volumeBonus >= 0 ? '+' : ''}${volumeBonus}`);

  // ===== FATOR 3: CONSISTÊNCIA L10 =====
  const consistency1Plus = countL10Consistency(playerStats, 'total_shots', 1, 10);
  const consistency2Plus = countL10Consistency(playerStats, 'total_shots', 2, 10);
  let consistencyBonus = 0;
  let consistencyReason = '';

  if (consistency1Plus === 10) {
    consistencyBonus = 20;
    consistencyReason = '10/10 jogos com >= 1 shot (perfeito)';
  } else if (consistency1Plus >= 8) {
    consistencyBonus = 15;
    consistencyReason = `${consistency1Plus}/10 jogos com >= 1 shot`;
  } else if (consistency1Plus >= 6) {
    consistencyBonus = 10;
    consistencyReason = `${consistency1Plus}/10 jogos com >= 1 shot`;
  } else if (consistency1Plus >= 4) {
    consistencyBonus = 5;
    consistencyReason = `${consistency1Plus}/10 jogos com >= 1 shot`;
  } else {
    consistencyBonus = -5;
    consistencyReason = `${consistency1Plus}/10 jogos com >= 1 shot (inconsistente)`;
  }

  score += consistencyBonus;
  breakdown.consistency = {
    value: consistencyBonus,
    gamesWithShot: consistency1Plus,
    gamesWithTwoShots: consistency2Plus,
    reason: consistencyReason
  };
  factors.push(`| Consistência (L10): ${consistencyReason}: ${consistencyBonus >= 0 ? '+' : ''}${consistencyBonus}`);

  // ===== FATOR 4: xG (QUALIDADE DAS FINALIZAÇÕES) =====
  const avgXG = calculateL10Average(playerStats, 'expected_goals', 10);
  let xgBonus = 0;
  let xgReason = '';

  if (avgXG >= 0.6) {
    xgBonus = 15;
    xgReason = `${avgXG} xG/jogo (alta qualidade)`;
  } else if (avgXG >= 0.35) {
    xgBonus = 10;
    xgReason = `${avgXG} xG/jogo (bom)`;
  } else if (avgXG >= 0.1) {
    xgBonus = 5;
    xgReason = `${avgXG} xG/jogo (presente)`;
  } else {
    xgBonus = -5;
    xgReason = `${avgXG} xG/jogo (baixo)`;
  }

  score += xgBonus;
  breakdown.xg = { value: xgBonus, average: avgXG, reason: xgReason };
  factors.push(`| xG (L10): ${avgXG} xG/jogo: ${xgBonus >= 0 ? '+' : ''}${xgBonus}`);

  // ===== FATOR 5: MINUTOS JOGADOS =====
  const avgMinutes = calculateL10Average(playerStats, 'minutes_played', 10);
  let minutesBonus = 0;
  let minutesReason = '';

  if (avgMinutes >= 80) {
    minutesBonus = 10;
    minutesReason = `${avgMinutes} min/jogo (titular absoluto)`;
  } else if (avgMinutes >= 60) {
    minutesBonus = 5;
    minutesReason = `${avgMinutes} min/jogo (regular)`;
  } else if (avgMinutes >= 45) {
    minutesBonus = 2;
    minutesReason = `${avgMinutes} min/jogo (limitado)`;
  } else {
    minutesBonus = -5;
    minutesReason = `${avgMinutes} min/jogo (pouco tempo)`;
  }

  score += minutesBonus;
  breakdown.minutes = { value: minutesBonus, average: avgMinutes, reason: minutesReason };
  factors.push(`| Minutos (L10): ${avgMinutes} min/jogo: ${minutesBonus >= 0 ? '+' : ''}${minutesBonus}`);

  // ===== FATOR 6: POSIÇÃO E FORMAÇÃO =====
  const isAttacker = player.position === 'F';
  const isMidfielder = player.position === 'M';
  const isOffensiveFormation = 
    formation.includes('4-3-3') || 
    formation.includes('4-4-2') || 
    formation.includes('5-3-2');
  
  let formationBonus = 0;
  let formationReason = '';

  if (isAttacker) {
    formationBonus = 15;
    formationReason = `posição ${player.position} (atacante = máxima produção)`;
  } else if (isMidfielder && isOffensiveFormation) {
    formationBonus = 10;
    formationReason = `formação ${formation} ofensiva`;
  } else if (isMidfielder) {
    formationBonus = 5;
    formationReason = `meia em formação neutra`;
  } else {
    formationBonus = 0;
    formationReason = `posição ${player.position} (pouca produção)`;
  }

  score += formationBonus;
  breakdown.formation = { value: formationBonus, position: player.position, formation, reason: formationReason };
  factors.push(`| Posição/Formação: ${formationReason}: ${formationBonus >= 0 ? '+' : ''}${formationBonus}`);

  // ===== PENALIDADE: DEFENSORES/GOLEIROS =====
  if (player.position === 'D' || player.position === 'G') {
    score -= 30;
    breakdown.penalty = { value: -30, reason: `posição defensiva ${player.position}` };
    factors.push(`| PENALIDADE: posição ${player.position}: -30`);
  }

  // ===== LIMITE 0-100 =====
  const finalScore = Math.max(0, Math.min(score, 100));

  return {
    score: finalScore,
    factors,
    breakdown,
    recommendations: recommendShotLines(avgShots, consistency1Plus, player, formation)
  };
}

/**
 * Calcula o score de convicção (0-100) para um jogador em um mercado específico
 * @param {Object} context - { game, lineup, homeStats, awayStats }
 * @param {number} playerId - ID do jogador a analisar
 * @param {string} market - Mercado ("shots", "corners", etc)
 * @returns {Object|null} { playerId, playerName, market, score, factors, breakdown, recommendations, explanation }
 */
export async function calculatePlayerConviction(context, playerId, market = 'shots') {
  try {
    const { game, lineup, homeStats, awayStats } = context;

    // Validar entrada
    if (!context || !lineup || !playerId || !market) {
      logger.warn('calculatePlayerConviction: contexto incompleto');
      return null;
    }

    // 1. Encontrar o jogador nos starters
    const player = findPlayerInLineup(lineup, playerId);
    if (!player) {
      logger.warn(`Jogador ${playerId} não encontrado nos starters`);
      return null;
    }

    // 2. Encontrar stats do jogador
    const playerStats = findPlayerStats(homeStats, awayStats, player, lineup);
    if (!playerStats) {
      logger.warn(`Stats não encontrados para jogador ${playerId}`);
      return null;
    }

    // 3. Obter dados contextuais
    const formation = player.team === 'home' ? lineup.home.formation : lineup.away.formation;

    // 4. Calcular fatores baseado no mercado
    let conviction = null;

    if (market === 'shots') {
      conviction = calculateShotsFactors(playerStats, player, formation);
    } else {
      logger.warn(`Mercado ${market} não implementado ainda`);
      return null;
    }

    // 5. Montar resposta completa
    const response = {
      playerId,
      playerName: player.name,
      position: player.position,
      market,
      score: conviction.score,
      factors: conviction.factors,
      breakdown: conviction.breakdown,
      recommendations: conviction.recommendations,
      explanation: generateExplanation(conviction, player)
    };

    logger.info(`Conviction L10 calculada: ${player.name} (${market}) = ${conviction.score}/100`);

    return response;

  } catch (error) {
    logger.error(`Erro ao calcular conviction`, error);
    throw error;
  }
}

/**
 * Gera explicação textual da conviction
 * @param {Object} conviction - Objeto com score, breakdown, recommendations
 * @param {Object} player - Dados do jogador
 * @returns {string} Explicação em linguagem natural
 */
function generateExplanation(conviction, player) {
  const { score, breakdown } = conviction;

  if (score >= 80) {
    return `${player.name} apresenta contexto ELITE para SHOTS. Alto volume histórico (L10), consistência comprovada e formação ofensiva. Recomendado para análise aprofundada.`;
  } else if (score >= 70) {
    return `${player.name} em bom momento. Volume consistente nos últimos 10 jogos, com xG favorável. Padrão recomendado para apostas.`;
  } else if (score >= 60) {
    return `${player.name} apresenta contexto moderado. Alguns fatores positivos, mas com inconsistências. Análise caso a caso necessária.`;
  } else if (score >= 40) {
    return `${player.name} em contexto neutro. Fatores mistos que requerem análise aprofundada antes de qualquer decisão.`;
  } else {
    return `${player.name} com contexto desfavorável para SHOTS. Baixo volume e/ou inconsistência nos últimos 10 jogos.`;
  }
}

/**
 * Calcula convictions para múltiplos jogadores
 * @param {Object} context - { game, lineup, homeStats, awayStats }
 * @param {number[]} playerIds - Array de IDs de jogadores
 * @param {string[]} markets - Array de mercados (default: ['shots'])
 * @returns {Promise<Object[]>} Array de convictions
 */
export async function calculateMultipleConvictions(context, playerIds, markets = ['shots']) {
  const convictions = [];

  for (const playerId of playerIds) {
    for (const market of markets) {
      const conviction = await calculatePlayerConviction(context, playerId, market);
      if (conviction) {
        convictions.push(conviction);
      }
    }
  }

  return convictions;
}