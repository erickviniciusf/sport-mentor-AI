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
        
        // 🔑 OTIMIZAÇÃO CRÍTICA: Filtrar ANTES apenas jogos ativos
        // Reduz de 50+ jogos para ~5-10, economizando muitas API calls
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

        // 2. Filtra só os com lineup confirmado
        content.setContent('{yellow-fg}Buscando jogos com lineup confirmado...{/yellow-fg}');

        const confirmed = [];
        // 🔑 MUDANÇA: Agora percorre APENAS activeMatches, não todos os matches
        for (const match of activeMatches) {
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

        // 🔑 ADIÇÃO: Também filtra p.id !== null (BSD retorna alguns players sem ID)
        const relevantPlayers = allStarters.filter(p => 
            (p.position === 'F' || p.position === 'M') && p.id !== null
        );

        content.setContent('{yellow-fg}Calculando convictions...{/yellow-fg}');

        const convictions = [];
        for (const player of relevantPlayers) {
            const conviction = await calculatePlayerConviction(context, player.id, 'shots');
            if (conviction) convictions.push(conviction);
        }

        // 5. Gera tips
        const tips = await buildTips(convictions);
        setGlobalTips(tips);

        // 6. Ordena por score
        const sorted = convictions.sort((a, b) => b.score - a.score);

        // 7. Monta o conteúdo com CORES e formatação melhorada
        const sep = '━'.repeat(120);
        const header = `{bold}ANÁLISE: ${match.home_team} vs ${match.away_team}{/bold}\n` +
                       `Formação: {cyan-fg}${context.lineup.home.formation}{/cyan-fg} vs {cyan-fg}${context.lineup.away.formation}{/cyan-fg}\n` +
                       `${sep}\n\n`;

        // 🔑 CORES: [TIP] em verde, scores em amarelo
        const convictionList = sorted.map(c => {
            const indicator = c.score >= 70 
                ? '{green-fg}[TIP]{/green-fg}' 
                : '     ';
            return `${indicator} ${c.playerName.padEnd(25)} | ${c.market.padEnd(8)} | {yellow-fg}${String(c.score).padStart(3)}/100{/yellow-fg}`;
        }).join('\n');

        // 🔑 SEÇÃO DE TIPS com cores destacadas
        const tipsSection = tips.length > 0
            ? `\n${sep}\n{green-fg}{bold}✓ TIPS GERADOS (score >= 70): ${tips.length}{/bold}{/green-fg}\n` +
              tips.map(t => `  >> {green-fg}${t.playerName}{/green-fg} | ${t.market} | {yellow-fg}${t.score}/100{/yellow-fg}`).join('\n')
            : `\n${sep}\n{red-fg}✗ Nenhum tip gerado para este jogo.{/red-fg}`;

        content.setContent(header + convictionList + tipsSection);

        logger.info(`Análise completa: ${match.home_team} vs ${match.away_team} - ${tips.length} tips gerados`);

    } catch (error) {
        logger.error('Erro ao renderizar análise', error);
        content.setContent('{red-fg}Erro ao carregar análise. Verifique os logs.{/red-fg}');
    }
}