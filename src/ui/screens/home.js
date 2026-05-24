import { logger } from '../../utils/logger.js';

export async function renderHome(content) {
    try {
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

{bold}v1.0.0{/bold}{/center}

{center}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{/center}

{center}🟢 Monitor: {green-fg}ATIVO{/green-fg}     📅 Jogos hoje: {green-fg}carregando...{/green-fg}{/center}
{center}✅ Lineups confirmados: {green-fg}carregando...{/green-fg}     💡 Tips gerados: {green-fg}carregando...{/green-fg}{/center}

{center}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{/center}

{center}{green-fg}Inteligência esportiva always-on{/green-fg}{/center}
{center}Pressione {bold}Q{/bold} para sair{/center}`
        );

    } catch (error) {
        logger.error('Erro ao renderizar home', error);
    }
}