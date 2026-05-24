import { logger } from '../utils/logger.js';
import { getPlayerContext } from '../providers/bsd/adapter.js'
import { getMatchesOfDay } from './matchService.js';


async function startMonitor() {
    while(true) {
        try {
            const matches = await getMatchesOfDay(); // busca jogos
            for (const match of matches) {
                 const context = await getPlayerContext(match.id);
            if (context) {
                logger.info(`Lineup confirmado: ${match.home_team} vs ${match.away_team}`);
            } 
                }  
                
          } catch (error) {
                logger.error("Mensagem descritiva do que falho", error);
        } 
            await new Promise(resolve => setTimeout(resolve, 60000));
    }
}

export { startMonitor };