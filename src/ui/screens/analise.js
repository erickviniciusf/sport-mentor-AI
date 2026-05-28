import { getMatchesOfDay } from "../../services/matchService.js";
import { getPlayerContext } from "../../providers/bsd/adapter.js";
import { calculatePlayerConviction } from "../../engines/convictionEngine.js";
import { buildTips } from "../../engines/tipsBuilder.js";
import { logger } from "../../utils/logger.js";
import { setGlobalTips, incrementLineups, incrementTips } from "../state.js";

export async function renderAnalise(content) {
    try {
        content.setContent('{yellow-fg}Buscando jogos ativos/futuros...{/yellow-fg}');
        const matches = await getMatchesOfDay();
        
        // ===== FILTRAR APENAS JOGOS ATIVOS OU FUTUROS =====
        const activeMatches = matches.filter(match => 
            match.status === 'notstarted' || 
            match.status === 'inprogress' || 
            match.status === '1st_half' || 
            match.status === '2nd_half'
        );

        if (activeMatches.length === 0) {
            content.setContent('Nenhum jogo ativo no momento.');
            return;
        }

        content.setContent('{yellow-fg}Buscando jogos com escalações (confirmadas ou previstas)...{/yellow-fg}');

        const confirmed = [];
        for (const match of activeMatches) {
            const context = await getPlayerContext(match.id);
            if (context) {
                // Verificar se escalação é confirmada ou prevista
                const lineupStatus = context.lineup.lineup_status || 'unknown';
                const lineupConfirmed = lineupStatus === 'confirmed';
                
                confirmed.push({ 
                    match, 
                    context,
                    lineupConfirmed,
                    lineupStatus
                });
                incrementLineups(1);
            }
        }

        if (confirmed.length === 0) {
            content.setContent('{yellow-fg}Nenhum jogo com escalação disponível no momento.{/yellow-fg}');
            return;
        }

        // Pega até 5 jogos, ou 3 se tiver menos de 5
        const limite = confirmed.length >= 5 ? 5 : confirmed.length >= 3 ? 3 : confirmed.length;
        const jogosParaAnalisar = confirmed.slice(0, limite);

        content.setContent('{yellow-fg}Calculando convictions L10...{/yellow-fg}');

        const sep = '━'.repeat(120);
        let output = '';
        const allTips = [];

        for (const { match, context, lineupConfirmed, lineupStatus } of jogosParaAnalisar) {
            const allStarters = [
                ...context.lineup.home.starters,
                ...context.lineup.away.starters
            ];

            const relevantPlayers = allStarters.filter(p =>
                (p.position === 'F' || p.position === 'M') && p.id !== null
            );

            // ===== CALCULAR CONVICTIONS L10 =====
            const convictions = [];
            for (const player of relevantPlayers) {
                const conviction = await calculatePlayerConviction(context, player.id, 'shots');
                if (conviction) convictions.push(conviction);
            }

            // ===== CONSTRUIR TIPS =====
            const tips = await buildTips(convictions);
            allTips.push(...tips);
            incrementTips(tips.length);

            // ===== ORDENAR POR SCORE =====
            const sorted = convictions.sort((a, b) => b.score - a.score);

            // ===== INDICADOR DE STATUS DE ESCALAÇÃO =====
            const statusIndicador = lineupConfirmed 
                ? '{green-fg}[ESCALAÇÃO CONFIRMADA]{/green-fg}'
                : '{yellow-fg}[ESCALAÇÃO NÃO CONFIRMADA AINDA]{/yellow-fg}';

            // ===== CABEÇALHO DO JOGO =====
output += `\n${sep}\n`;
output += `{bold}ANÁLISE: ${match.home_team} vs ${match.away_team}{/bold}\n`;
output += `Formação: {cyan-fg}${context.lineup.home.formation}{/cyan-fg} vs {cyan-fg}${context.lineup.away.formation}{/cyan-fg}\n`;

output += `Status: ${statusIndicador}\n`;
output += `${sep}\n\n`;

// ===== EXIBIR CONVICTIONS RESUMIDO (TODOS OS JOGADORES) =====
output += sorted.map(c => {
    const indicator = c.score >= 70
        ? '{green-fg}[TIP]{/green-fg}'
        : '     ';
    // Inclui a posição (c.position) se disponível (p/ analise técnica)
    return ` ${indicator} ${c.playerName.padEnd(22)} | ${(c.position || '--').padEnd(2)} | ${c.market.padEnd(8)} | {yellow-fg}${String(c.score).padStart(3)}/100{/yellow-fg}`;
}).join('\n');

// ===== EXIBIR TIPS GERADOS (SCORE >= 70 COM DETALHES) =====
if (tips.length > 0) {
    output += `\n\n{green-fg}{bold}TIPS GERADOS (${tips.length}):{/bold}{/green-fg}\n`;
    output += tips.map(tip => {
        const recLine = tip.recommendations && tip.recommendations.length > 0 
            ? tip.recommendations[0].line 
            : 'N/A';
        return `  | ${tip.playerName.padEnd(20)} | Over ${recLine.padEnd(5)} | Conviction: ${String(tip.score).padStart(3)}/100 | ${tip.scoreLabel}`;
    }).join('\n');
} else {
    output += `\n\n{red-fg}Nenhum tip para este jogo.{/red-fg}`;
}

output += '\n';
        }

        // ===== ARMAZENAR TODOS OS TIPS NO STATE GLOBAL =====
        setGlobalTips(allTips);
        content.setContent(output);

        logger.info(`Análise completa: ${jogosParaAnalisar.length} jogos analisados - ${allTips.length} tips gerados`);

    } catch (error) {
        logger.error('Erro ao renderizar análise', error);
        content.setContent('{red-fg}Erro ao carregar análise. Verifique os logs.{/red-fg}');
    }
}