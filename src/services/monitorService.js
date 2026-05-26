import { logger } from '../utils/logger.js';
import { getPlayerContext } from '../providers/bsd/adapter.js';
import { getMatchesOfDay } from './matchService.js';

// Cache em memória para garantir que cada lineup seja logado apenas UMA vez por sessão
const notifiedMatches = new Set();

async function startMonitor() {
    logger.info("Monitor de partidas iniciado (Ciclo de 60s)");

    while(true) {
        try {
            const matches = await getMatchesOfDay();
            
            for (const match of matches) {
                // Se já notificamos este jogo, pulamos para o próximo para economizar processamento e log
                if (notifiedMatches.has(match.id)) continue;

                const context = await getPlayerContext(match.id);
                
                if (context) {
                    // Agora este log só aparecerá UMA vez por jogo no seu app.log
                    logger.info(`[NOVO LINEUP] ${match.home_team} vs ${match.away_team}`);
                    notifiedMatches.add(match.id); 
                } 
            }  
                
        } catch (error) {
            // Garante que o Always-On continue mesmo se a internet oscilar
            logger.error("Erro no ciclo do monitor:", error.message);
        } 
        
        // Mantém a infraestrutura Lean com espera de 1 minuto
        await new Promise(resolve => setTimeout(resolve, 60000)); 
    }
}

export { startMonitor };