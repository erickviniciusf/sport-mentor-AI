import { logger } from '../utils/logger.js';

/**
 * Encontra um jogador na escalação (home ou away)
 * @param {Object} lineup - { home: {...}, away: {...} }
 * @param {number} playerId - ID do jogador procurado
 * @returns {Object|null} { id, name, position, team: 'home'|'away' }
 */
function findPlayerInLineup(lineup, playerId) {
  // Procura no time da casa
  const homePlayer = lineup.home.starters.find(p => p.id === playerId);
  if (homePlayer) {
    return { ...homePlayer, team: 'home' };
  }

  // Procura no time visitante
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
 * @returns {Object|null} Stats do jogador
 */
function findPlayerStats(homeStats, awayStats, player, lineup) {
  const stats = player.team === 'home' ? homeStats : awayStats;
  const starters = player.team === 'home' ? lineup.home.starters : lineup.away.starters;

  // Encontrar o índice do jogador na escalação do seu time
  const playerIndex = starters.findIndex(p => p.id === player.id);
  
  if (playerIndex === -1 || !stats[playerIndex]) {
    return null;
  }

  return stats[playerIndex];
}

/**
 * Calcula a média de um campo nos últimos N jogos
 * @param {Object} playerStats - Stats do jogador
 * @param {string} field - Campo a calcular (ex: 'total_shots', 'expected_goals')
 * @param {number} lastGames - Últimos N jogos (ex: 5 para L5)
 * @returns {number} Média arredondada
 */
function calculateAverage(playerStats, field, lastGames = 5) {
  if (!playerStats || !playerStats.results || playerStats.results.length === 0) {
    return 0;
  }

  const recentGames = playerStats.results.slice(-lastGames);
  const sum = recentGames.reduce((acc, game) => acc + (game[field] || 0), 0);
  
  return (sum / recentGames.length).toFixed(2);
}

/**
 * Conta quantos dos últimos N jogos teve pelo menos X do campo
 * @param {Object} playerStats - Stats do jogador
 * @param {string} field - Campo (ex: 'total_shots')
 * @param {number} threshold - Mínimo para contar (default: 1)
 * @param {number} lastGames - Últimos N jogos
 * @returns {number} Quantidade de jogos que atingiram o threshold
 */
function countConsistency(playerStats, field, threshold = 1, lastGames = 5) {
  if (!playerStats || !playerStats.results || playerStats.results.length === 0) {
    return 0;
  }

  const recentGames = playerStats.results.slice(-lastGames);
  return recentGames.filter(game => (game[field] || 0) >= threshold).length;
}

/**
 * Calcula fatores positivos/negativos baseado no mercado
 * @param {Object} playerStats - Stats do jogador
 * @param {Object} player - Dados do jogador
 * @param {string} formation - Formação do time (ex: "4-3-3")
 * @param {string} market - Mercado sendo analisado ("shots", "corners", etc)
 * @returns {Object} { score: number, factors: string[] }
 */
function calculateFactors(playerStats, player, formation, market) {
  let score = 0;
  const factors = [];

  // ✓ STARTER CONFIRMADO (CRÍTICO)
  score += 15;
  factors.push('+ starter confirmado');

  // Se for mercado de SHOTS
  if (market === 'shots') {
    // 1. VOLUME HISTÓRICO (peso alto)
    const avgShots = calculateAverage(playerStats, 'total_shots', 5);
    if (avgShots >= 3) {
      score += 25;
      factors.push(`+ média ${avgShots} shots últimos 5 jogos`);
    } else if (avgShots >= 2) {
      score += 15;
      factors.push(`+ média ${avgShots} shots últimos 5 jogos`);
    } else if (avgShots >= 1) {
      score += 5;
      factors.push(`+ média ${avgShots} shots últimos 5 jogos`);
    } else {
      factors.push(`- baixo volume de shots (${avgShots})`);
    }

    // 2. CONSISTÊNCIA (peso médio)
    const consistency = countConsistency(playerStats, 'total_shots', 1, 5);
    if (consistency === 5) {
      score += 20;
      factors.push(`+ consistência 5/5 jogos com shot`);
    } else if (consistency === 4) {
      score += 15;
      factors.push(`+ consistência 4/5 jogos com shot`);
    } else if (consistency === 3) {
      score += 10;
      factors.push(`+ consistência 3/5 jogos com shot`);
    }

    // 3. xG (peso médio)
    const avgXG = calculateAverage(playerStats, 'expected_goals', 5);
    if (avgXG >= 0.5) {
      score += 15;
      factors.push(`+ xG elevado (${avgXG})`);
    } else if (avgXG >= 0.3) {
      score += 10;
      factors.push(`+ xG moderado (${avgXG})`);
    } else if (avgXG >= 0.1) {
      score += 5;
      factors.push(`+ xG presente (${avgXG})`);
    }

    // 4. MINUTOS JOGADOS (peso baixo)
    const avgMinutes = calculateAverage(playerStats, 'minutes_played', 5);
    if (avgMinutes >= 70) {
      score += 10;
      factors.push(`+ starter consistente (${avgMinutes} min)`);
    } else if (avgMinutes >= 45) {
      score += 5;
      factors.push(`+ participa regularmente (${avgMinutes} min)`);
    }

    // 5. POSIÇÃO/FORMAÇÃO (peso médio)
    const isAttacker = player.position === 'F';
    const isMidfielder = player.position === 'M';
    const isOffensiveFormation = formation.includes('4-3-3') || formation.includes('4-4-2');

    if (isAttacker) {
      score += 15;
      factors.push(`+ posição ${player.position} (atacante = volume ofensivo)`);
    } else if (isMidfielder && isOffensiveFormation) {
      score += 10;
      factors.push(`+ formação ${formation} ofensiva`);
    }

    // 6. PENALIDADES
    // Defensor ou goleiro = -30 (não deve estar analisando eles para shots)
    if (player.position === 'D' || player.position === 'G') {
      score -= 30;
      factors.push(`- posição defensiva (${player.position})`);
    }
  }

  // Se for mercado de CORNERS
  if (market === 'corners') {
    // Corners é mais sobre formação e função tática
    // Não existe 'corners' direto no BSD, mas deixamos a estrutura preparada

    const avgCrosses = calculateAverage(playerStats, 'total_crosses', 5);
    if (avgCrosses >= 5) {
      score += 20;
      factors.push(`+ alta taxa de cruzamentos (${avgCrosses})`);
    } else if (avgCrosses >= 3) {
      score += 10;
      factors.push(`+ cruza regularmente (${avgCrosses})`);
    }

    const isWinger = player.specific_position === 'LW' || player.specific_position === 'RW';
    if (isWinger) {
      score += 15;
      factors.push(`+ posição ${player.specific_position} (gera volume lateral)`);
    }
  }

  // Limitar ao máximo 100
  const finalScore = Math.max(0, Math.min(score, 100));

  return { score: finalScore, factors };
}

/**
 * Gera explicação textual do conviction
 * @param {string[]} factors - Array de fatores
 * @param {number} score - Score final
 * @param {Object} player - Dados do jogador
 * @returns {string} Explicação em linguagem natural
 */
function generateExplanation(factors, score, player) {
  let explanation = `${player.name} apresenta `;

  if (score >= 75) {
    explanation += 'contexto muito favorável para este mercado. ';
  } else if (score >= 60) {
    explanation += 'bom contexto com fatores positivos. ';
  } else if (score >= 40) {
    explanation += 'contexto neutro com fatores mistos. ';
  } else {
    explanation += 'contexto desfavorável para este mercado. ';
  }

  explanation += `Fatores relevantes: ${factors.slice(0, 3).map(f => f.replace(/[+-] /, '')).join(', ')}.`;

  return explanation;
}

/**
 * Calcula o score de convicção (0-100) para um jogador em um mercado específico
 * @param {Object} context - { game, lineup, homeStats, awayStats }
 * @param {number} playerId - ID do jogador a analisar
 * @param {string} market - Mercado ("shots", "corners", etc)
 * @returns {Object|null} { playerId, playerName, market, score, factors, explanation }
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

    // 4. Calcular fatores
    const { score, factors } = calculateFactors(playerStats, player, formation, market);

    // 5. Gerar explicação
    const explanation = generateExplanation(factors, score, player);

    // 6. Montar resposta
    const conviction = {
      playerId,
      playerName: player.name,
      market,
      score,
      factors,
      explanation
    };

    logger.info(`Conviction calculada: ${player.name} (${market}) = ${score}`);

    return conviction;

  } catch (error) {
    logger.error(`Erro ao calcular conviction`, error);
    throw error;
  }
}

/**
 * Calcula convictions para múltiplos jogadores e mercados
 * @param {Object} context - { game, lineup, homeStats, awayStats }
 * @param {number[]} playerIds - Array de IDs de jogadores
 * @param {string[]} markets - Array de mercados
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