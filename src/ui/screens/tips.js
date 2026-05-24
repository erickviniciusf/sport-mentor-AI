import { buildTips } from "../../engines/tipsBuilder.js"
import { logger } from "../../utils/logger.js";

export async function renderTips(content) {
    try {
        content.setContent(
            `{center}{bold}💡 TIPS DO DIA{/bold}{/center}

                Nenhum tip gerado ainda.
 
                        Para gerar tips:
                1. Vá em Análise
                2. Selecione um jogo com lineup confirmado
                3. Os tips aparecerão aqui automaticamente`
);
        
    } catch (error) {
    logger.error('Erro ao renderizar tips', error);
    }
}