import { getMatchesOfDay } from "../../services/matchService.js";
import { getPlayerContext } from "../../providers/bsd/adapter.js";
import { calculatePlayerConviction } from "../../engines/convictionEngine.js";
import { buildTips } from "../../engines/tipsBuilder.js";
import { logger } from "../../utils/logger.js";
import { setGlobalTips } from "../state.js";

export async function renderAnalise(content) {
    try {
        content.setContent('{yellow-fg}Buscando jogos ativos...{/yellow-fg}');
        const matches = await getMatchesOfDay();
        
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

        content.setContent('{yellow-fg}Buscando jogos com lineup confirmado...{/yellow-fg}');

        const confirmed = [];
        for (const match of activeMatches) {
            const context = await getPlayerContext(match.id);
            if (context) confirmed.push({ match, context });
        }

        if (confirmed.length === 0) {
            content.setContent('Nenhum jogo com lineup confirmado no momento.');
            return;
        }

        // Pega até 5 jogos, ou 3 se tiver menos de 5
        const limite = confirmed.length >= 5 ? 5 : confirmed.length >= 3 ? 3 : confirmed.length;
        const jogosParaAnalisar = confirmed.slice(0, limite);

        content.setContent('{yellow-fg}Calculando convictions...{/yellow-fg}');

        const sep = '━'.repeat(120);
        let output = '';
        const allTips = [];

        for (const { match, context } of jogosParaAnalisar) {
            const allStarters = [
                ...context.lineup.home.starters,
                ...context.lineup.away.starters
            ];

            const relevantPlayers = allStarters.filter(p =>
                (p.position === 'F' || p.position === 'M') && p.id !== null
            );

            const convictions = [];
            for (const player of relevantPlayers) {
                const conviction = await calculatePlayerConviction(context, player.id, 'shots');
                if (conviction) convictions.push(conviction);
            }

            const tips = await buildTips(convictions);
            allTips.push(...tips);

            const sorted = convictions.sort((a, b) => b.score - a.score);

            output += `\n${sep}\n`;
            output += `{bold}ANÁLISE: ${match.home_team} vs ${match.away_team}{/bold}\n`;
            output += `Formação: {cyan-fg}${context.lineup.home.formation}{/cyan-fg} vs {cyan-fg}${context.lineup.away.formation}{/cyan-fg}\n`;
            output += `${sep}\n\n`;

            output += sorted.map(c => {
                const indicator = c.score >= 70
                    ? '{green-fg}[TIP]{/green-fg}'
                    : '     ';
                return ` ${indicator} ${c.playerName.padEnd(25)} | ${c.market.padEnd(8)} | {yellow-fg}${String(c.score).padStart(3)}/100{/yellow-fg}`;
            }).join('\n');

            if (tips.length > 0) {
                output += `\n\n{green-fg}{bold}✓ TIPS: ${tips.map(t => `${t.playerName} ${t.score}/100`).join(' | ')}{/bold}{/green-fg}`;
            } else {
                output += `\n\n{red-fg}✗ Nenhum tip para este jogo.{/red-fg}`;
            }

            output += '\n';
        }

        setGlobalTips(allTips);
        content.setContent(output);

        logger.info(`Análise completa: ${jogosParaAnalisar.length} jogos analisados - ${allTips.length} tips gerados`);

    } catch (error) {
        logger.error('Erro ao renderizar análise', error);
        content.setContent('{red-fg}Erro ao carregar análise. Verifique os logs.{/red-fg}');
    }
}