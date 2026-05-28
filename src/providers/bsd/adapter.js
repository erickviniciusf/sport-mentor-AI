
import { logger } from '../../utils/logger.js';
import { getEvent, getLineup, getPlayerStats } from './client.js';
import { mapper } from './mapper.js';

export async function getPlayerContext(eventId) {
  try {
    const rawGame = await getEvent(eventId);
    const rawLineup = await getLineup(eventId); 
    
    if (!rawLineup.lineup_status || !['confirmed', 'predicted'].includes(rawLineup.lineup_status)) {
    logger.warn(`Lineup não disponível para o evento ${eventId}`);
    return null;
    }
    const game = mapper.mapGame(rawGame);
    const lineup = mapper.mapLineup(rawLineup);

    const homeStats = await Promise.all(
    lineup.home.starters.map(player => getPlayerStats(player.id))
    );

    const awayStats = await Promise.all(
    lineup.away.starters.map(player => getPlayerStats(player.id))
    );
    
    return { game, lineup, homeStats, awayStats, lineup_status: rawLineup.lineup_status };

  } catch (error) {
        logger.error("Mensagem descritiva do que falho", error);
        throw error; 
    }  
}