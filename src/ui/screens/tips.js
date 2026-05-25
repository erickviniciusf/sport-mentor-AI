import { getGlobalTips } from "../state.js";  // ← NOVA IMPORTAÇÃO
import { logger } from "../../utils/logger.js";

export async function renderTips(content) {
    try {
        // 1. Buscar os tips que foram gerados na Análise
        const tips = getGlobalTips();

        // 2. Se não houver tips, mostrar mensagem
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

        // 3. Se houver tips, exibir em formato tabular
        const sep = '━'.repeat(120);
        const header = `{center}{bold}{green-fg}✓ TIPS DO DIA — ${tips.length} sugestões{/green-fg}{/bold}{/center}\n${sep}\n\n`;

        // 4. Mapear cada tip para exibição colorida
        const tipsList = tips.map((tip, index) => {
            return `{green-fg}[${index + 1}]{/green-fg} ${tip.playerName.padEnd(25)} | ${tip.market.padEnd(8)} | {yellow-fg}${tip.score}/100{/yellow-fg}`;
        }).join('\n');

        // 5. Renderizar
        content.setContent(header + tipsList);

        logger.info(`Tips exibidos: ${tips.length}`);

    } catch (error) {
        logger.error('Erro ao renderizar tips', error);
        content.setContent('{red-fg}Erro ao carregar tips.{/red-fg}');
    }
}