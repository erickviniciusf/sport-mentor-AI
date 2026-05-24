import { getMatchesOfDay } from "../../services/matchService.js";
import { getPlayerContext } from "../../providers/bsd/adapter.js";
import { calculatePlayerConviction } from "../../engines/convictionEngine.js";
import { buildTips } from "../../engines/tipsBuilder.js";
import { logger } from "../../utils/logger.js";

export async function renderAnalise(content) {
    try {
        // 1. Busca jogos do dia
        const matches = await getMatchesOfDay();

        // 2. Filtra só os com lineup confirmado
        content.setContent('Buscando jogos com lineup confirmado...');

        const confirmed = [];
        for (const match of matches) {
            const context = await getPlayerContext(match.id);
            if (context) confirmed.push({ match, context });
        }

        if (confirmed.length === 0) {
            content.setContent('Nenhum jogo com lineup confirmado no momento.');
            return;
        }

        // 3. Pega o primeiro jogo confirmado
        const { match, context } = confirmed[0];

        // 4. Calcula convictions dos atacantes e meias
        const allStarters = [
            ...context.lineup.home.starters,
            ...context.lineup.away.starters
        ];

        const relevantPlayers = allStarters.filter(p => p.position === 'F' || p.position === 'M');

        const convictions = [];
        for (const player of relevantPlayers) {
            const conviction = await calculatePlayerConviction(context, player.id, 'shots');
            if (conviction) convictions.push(conviction);
        }

        // 5. Gera tips
        const tips = await buildTips(convictions);

        // 6. Ordena por score
        const sorted = convictions.sort((a, b) => b.score - a.score);

        // 7. Monta o conteúdo
        const header = `ANÁLISE: ${match.home_team} vs ${match.away_team}\n` +
                       `Formação: ${context.lineup.home.formation} vs ${context.lineup.away.formation}\n` +
                       `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        const convictionList = sorted.map(c => {
            const indicator = c.score >= 70 ? '[TIP]' : '     ';
            return `${indicator} ${c.playerName.padEnd(20)} | ${c.market.padEnd(8)} | ${String(c.score).padStart(3)}/100`;
        }).join('\n');

        const tipsSection = tips.length > 0
            ? `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nTIPS GERADOS (score >= 70): ${tips.length}\n` +
              tips.map(t => `  >> ${t.playerName} | ${t.market} | ${t.score}/100`).join('\n')
            : '\n\nNenhum tip gerado para este jogo.';

        content.setContent(header + convictionList + tipsSection);

    } catch (error) {
        logger.error('Erro ao renderizar análise', error);
        content.setContent('Erro ao carregar análise. Verifique os logs.');
    }
}