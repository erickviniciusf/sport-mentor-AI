import { logger } from '../utils/logger.js';
import { getPlayerContext } from '../providers/bsd/adapter.js';
import { getMatchesOfDay } from './matchService.js';
import { eventBus, EVENTS, handleError } from '../core/index.js';

// Cache em memória para garantir que cada lineup seja notificado apenas UMA vez por sessão
const notifiedMatches = new Set();

async function startMonitor() {
    logger.info("Monitor de partidas iniciado (ciclo a cada 60s, provider BSD)");

    // Emitir evento de inicialização
    eventBus.emit(EVENTS.MONITOR_STARTED, {
        timestamp: Date.now()
    });

    while(true) {
        try {
            const matches = await getMatchesOfDay();
            
            // Emitir evento quando lista de partidas é atualizada
            eventBus.emit(EVENTS.MATCH_LIST_UPDATED, {
                matches,
                count: matches.length,
                timestamp: Date.now()
            });
            
            for (const match of matches) {
                // Se já notificamos este jogo, pulamos para economizar processamento
                if (notifiedMatches.has(match.id)) continue;

                try {
                    const context = await getPlayerContext(match.id);
                    
                    if (context) {
                        logger.info(`[NOVO LINEUP] ${match.home_team} vs ${match.away_team}`);

                        // Emitir evento quando lineup é confirmado
                        eventBus.emit(EVENTS.LINEUP_CONFIRMED, {
                            matchId: match.id,
                            homeTeam: match.home_team,
                            awayTeam: match.away_team,
                            context,
                            timestamp: Date.now()
                        });

                        notifiedMatches.add(match.id); 
                    }
                } catch (error) {
                    // Não falhar o ciclo inteiro por falha em um jogo
                    handleError(error, {
                        operation: 'getPlayerContext',
                        matchId: match.id,
                        matchName: `${match.home_team} vs ${match.away_team}`
                    });
                }
            }  

            // Emitir evento de conclusão do ciclo
            eventBus.emit(EVENTS.MONITOR_CYCLE_COMPLETE, {
                matchesProcessed: matches.length,
                newLineupsFound: matches.filter(m => notifiedMatches.has(m.id)).length,
                timestamp: Date.now()
            });
                
        } catch (error) {
            // Falha no ciclo geral (ex: fetch de matches falhou)
            const handledError = handleError(error, { 
                operation: 'monitor_cycle',
                cycleNumber: notifiedMatches.size
            });

            logger.warn(`Monitor will retry in 60s after error: ${handledError.message}`);
        } 
        
        // Aguarda 1 minuto para próximo ciclo
        await new Promise(resolve => setTimeout(resolve, 60000)); 
    }
}

export { startMonitor };