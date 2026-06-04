import { getGlobalTips } from "../state.js";
import { logger } from "../../utils/logger.js";

/**
 * Renderiza um tip expandido com breakdown completo
 * @param {Object} tip - Objeto de tip com breakdown e recommendations
 * @returns {string} Texto formatado para blessed
 */
function renderExpandedTip(tip) {
  const sep = '═'.repeat(110);
  const subSep = '─'.repeat(110);

  let output = `\n${sep}\n`;
  output += `{bold}${tip.playerName.toUpperCase()} (${tip.position}) | ${tip.market.toUpperCase()}{/bold}\n`;
  output += `Conviction: {yellow-fg}${tip.score}/100{/yellow-fg} | Status: {green-fg}${tip.scoreLabel}{/green-fg}\n`;
  output += `${sep}\n\n`;

  // ===== SEÇÃO 1: FATORES L10 =====
  output += `{bold}FATORES QUE IMPACTARAM (L10):{/bold}\n`;
  output += `${subSep}\n`;

  const breakdown = tip.breakdown;

  if (breakdown.starter) {
    output += formatFactorLine('Starter confirmado', breakdown.starter.value) + '\n';
  }

  if (breakdown.volume) {
    output += formatFactorLine(
      `Volume historico (L10: ${breakdown.volume.average} shots/jogo)`,
      breakdown.volume.value
    ) + '\n';
  }

  if (breakdown.consistency) {
    output += formatFactorLine(
      `Consistencia (${breakdown.consistency.gamesWithShot}/10 jogos com >= 1 shot)`,
      breakdown.consistency.value
    ) + '\n';
  }

  if (breakdown.xg) {
    output += formatFactorLine(
      `xG elevado (${breakdown.xg.average} xG/jogo)`,
      breakdown.xg.value
    ) + '\n';
  }

  if (breakdown.minutes) {
    output += formatFactorLine(
      `Minutos jogados (${breakdown.minutes.average} min/jogo)`,
      breakdown.minutes.value
    ) + '\n';
  }

  if (breakdown.formation) {
    output += formatFactorLine(
      `Posicao/Formacao (${breakdown.formation.position} em ${breakdown.formation.formation})`,
      breakdown.formation.value
    ) + '\n';
  }

  if (breakdown.penalty) {
    output += formatFactorLine(
      `PENALIDADE: ${breakdown.penalty.reason}`,
      breakdown.penalty.value
    ) + '\n';
  }

  output += `${subSep}\n`;
  output += `{bold}TOTAL: ${tip.score}/100{/bold}\n\n`;

  // ===== SEÇÃO 2: ANÁLISE L10 =====
  output += `{bold}ANALISE DOS ULTIMOS 10 JOGOS:{/bold}\n`;
  output += `${subSep}\n`;

  if (breakdown.volume && breakdown.consistency) {
    output += `  | Media de chutes (L10):                          ${breakdown.volume.average} por jogo |\n`;
    output += `  | Jogos com >= 1 shot:                           ${breakdown.consistency.gamesWithShot}/10       |\n`;
    output += `  | Jogos com >= 2 shots:                          ${breakdown.consistency.gamesWithTwoShots}/10       |\n`;
  }

  if (breakdown.xg) {
    output += `  | xG medio (L10):                                 ${breakdown.xg.average}           |\n`;
  }

  if (breakdown.minutes) {
    output += `  | Minutos medio (L10):                            ${breakdown.minutes.average} min/jogo |\n`;
  }

  output += `${subSep}\n\n`;

  // ===== SEÇÃO 3: RECOMENDAÇÕES DE LINHA =====
  output += `{bold}RECOMENDACOES DE LINHA:{/bold}\n`;
  output += `${subSep}\n`;

  if (tip.recommendations && tip.recommendations.length > 0) {
    tip.recommendations.forEach((rec, idx) => {
      const probColor = rec.probability === 'SEGURO' ? 'green-fg'
        : rec.probability === 'PROVÁVEL' ? 'yellow-fg'
          : 'cyan-fg';

      output += `  [${idx + 1}] Over ${rec.line.padEnd(5)} | {${probColor}}${rec.probability}{/${probColor}}\n`;
    });
  } else {
    output += `  Sem recomendações claras\n`;
  }

  output += '\n';

  // ===== SEÇÃO 4: RESUMO =====
  output += `{bold}RESUMO:{/bold}\n`;
  output += `${subSep}\n`;
  output += `${tip.explanation}\n`;
  output += `${sep}\n`;

  return output;
}

/**
 * Formata uma linha de fator com alinhamento
 * @param {string} label - Descrição do fator
 * @param {number} value - Valor do bônus/penalidade
 * @returns {string} Linha formatada
 */
function formatFactorLine(label, value) {
  const sign = value >= 0 ? '+' : '';
  const color = value >= 15 ? 'green-fg' : value >= 5 ? 'yellow-fg' : value > 0 ? 'cyan-fg' : 'red-fg';

  return `  | ${label.padEnd(60)} | {${color}}${sign}${String(value).padStart(3)}{/${color}} |`;
}

/**
 * Renderiza lista resumida de todos os tips
 * @param {Array} tips - Array de tips
 * @returns {string} Lista formatada
 */
function renderTipsListSummary(tips) {
  const sep = '━'.repeat(110);
  let output = `{center}{bold}{green-fg}✓ TIPS DO DIA — ${tips.length} sugestões{/green-fg}{/bold}{/center}\n${sep}\n\n`;

  output += `{bold}LISTA RESUMIDA:{/bold}\n`;
  output += tips.map((tip, idx) => {
    const recLine = tip.recommendations && tip.recommendations.length > 0
      ? tip.recommendations[0].line
      : 'N/A';

    return `  {green-fg}[${idx + 1}]{/green-fg} ${tip.playerName.padEnd(20)} | ${tip.market.padEnd(8)} | Over ${recLine.padEnd(5)} | ${String(tip.score).padStart(3)}/100 | ${tip.scoreLabel}`;
  }).join('\n');

  output += `\n\n{cyan-fg}Selecione um tip acima para ver detalhes completos.{/cyan-fg}\n`;
  output += `Use as setas {bold}↑{/bold} e {bold}↓{/bold} para navegar — {bold}ESC{/bold} para voltar ao menu.\n`;

  return output;
}

/**
 * Renderiza com navegação interativa
 * @param {Object} content - Objeto blessed do painel
 * @param {Array} tips - Array de tips
 */
export async function renderTipsInteractive(content, selectedIndex = 0) {
  try {
    const tips = getGlobalTips();

    if (!tips || tips.length === 0) {
      content.setContent(
        `{center}{bold}💡 TIPS DO DIA{/bold}{/center}

Nenhum tip gerado ainda.

Para gerar tips:
  {cyan-fg}1.{/cyan-fg} Vá em {bold}Análise{/bold}
  {cyan-fg}2.{/cyan-fg} Selecione um jogo com lineup confirmado
  {cyan-fg}3.{/cyan-fg} Os tips aparecerão aqui automaticamente`
      );
      return;
    }

    // Validar índice selecionado
    const safeIndex = Math.max(0, Math.min(selectedIndex, tips.length - 1));
    const selectedTip = tips[safeIndex];

    // Renderizar: Lista resumida + Tip expandido
    let output = renderTipsListSummary(tips);
    output += '\n';
    output += renderExpandedTip(selectedTip);

    content.setContent(output);

    logger.info(`Tips exibidos: ${tips.length} (selecionado: ${safeIndex + 1})`);

  } catch (error) {
    logger.error('Erro ao renderizar tips interativo', error);
    content.setContent('{red-fg}Erro ao carregar tips.{/red-fg}');
  }
}

/**
 * Renderiza versão simples (compatível com código anterior)
 * @param {Object} content - Objeto blessed do painel
 */
export async function renderTips(content) {
  await renderTipsInteractive(content, 0);
}

/**
 * Função para navegação (chamada por keyboard handler)
 * @param {Object} content - Objeto blessed do painel
 * @param {string} direction - 'up' ou 'down'
 * @param {number} currentIndex - Índice atualmente selecionado
 * @returns {number} Novo índice
 */
export async function navigateTips(content, direction, currentIndex = 0) {
  const tips = getGlobalTips();

  if (!tips || tips.length === 0) return 0;

  let newIndex = currentIndex;

  if (direction === 'up') {
    newIndex = Math.max(0, currentIndex - 1);
  } else if (direction === 'down') {
    newIndex = Math.min(tips.length - 1, currentIndex + 1);
  }

  await renderTipsInteractive(content, newIndex);

  return newIndex;
}

/**
 * Renderiza apenas um tip expandido (útil para modal/detail view)
 * @param {Object} content - Objeto blessed do painel
 * @param {number} tipIndex - Índice do tip
 */
export async function renderTipDetail(content, tipIndex = 0) {
  try {
    const tips = getGlobalTips();

    if (!tips || tips.length === 0) {
      content.setContent('{red-fg}Nenhum tip disponível.{/red-fg}');
      return;
    }

    const safeIndex = Math.max(0, Math.min(tipIndex, tips.length - 1));
    const tip = tips[safeIndex];

    const output = `{center}{bold}TIP DETALHADO ({${safeIndex + 1}}/${tips.length}){/bold}{/center}\n\n${renderExpandedTip(tip)}`;

    content.setContent(output);

    logger.info(`Tip detalhado exibido: ${tip.playerName} (${safeIndex + 1}/${tips.length})`);

  } catch (error) {
    logger.error('Erro ao renderizar detalhe do tip', error);
    content.setContent('{red-fg}Erro ao carregar detalhe do tip.{/red-fg}');
  }
}