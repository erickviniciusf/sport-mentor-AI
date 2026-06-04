import { logger } from '../../utils/logger.js';
import { getSessionStats } from '../state.js';

export async function renderHome(content) {
    try {
        const { totalMatches, confirmedLineups, generatedTips } = getSessionStats();

        content.setContent(
`{center}{green-fg}
 ███████╗██████╗  ██████╗ ██████╗ ████████╗
 ██╔════╝██╔══██╗██╔═══██╗██╔══██╗╚══██╔══╝
 ███████╗██████╔╝██║   ██║██████╔╝   ██║   
 ╚════██║██╔═══╝ ██║   ██║██╔══██╗   ██║   
 ███████║██║     ╚██████╔╝██║  ██║   ██║   
 ╚══════╝╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝  

 ███╗   ███╗███████╗███╗   ██╗████████╗ ██████╗ ██████╗ 
 ████╗ ████║██╔════╝████╗  ██║╚══██╔══╝██╔═══██╗██╔══██╗
 ██╔████╔██║█████╗  ██╔██╗ ██║   ██║   ██║   ██║██████╔╝
 ██║╚██╔╝██║██╔══╝  ██║╚██╗██║   ██║   ██║   ██║██╔══██╗
 ██║ ╚═╝ ██║███████╗██║ ╚████║   ██║   ╚██████╔╝██║  ██║
 ╚═╝     ╚═╝╚══════╝╚═╝  ╚═══╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝
{/green-fg}

{bold}v1.0.1{/bold}{/center}

{center}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{/center}

{center}🟢 Monitor: {green-fg}ATIVO{/green-fg}     📅 Jogos hoje: {green-fg}${totalMatches}{/green-fg}{/center}
{center}✅ Lineups confirmados: {green-fg}${confirmedLineups}{/green-fg}     💡 Tips gerados: {green-fg}${generatedTips}{/green-fg}{/center}

{center}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{/center}

{center}{green-fg}Inteligência esportiva always-on{/green-fg}{/center}
{center}Pressione {bold}Q{/bold} para sair{/center}`
        );

    } catch (error) {
        logger.error('Erro ao renderizar home', error);
    }
}