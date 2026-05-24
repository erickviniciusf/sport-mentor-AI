
import { logger } from '../../utils/logger.js';
import { getEvent, getLineup, getPlayerStats } from './client.js';
import { mapper } from './mapper.js';

export async function getPlayerContext(eventId) {
  try {
    const rawGame = await getEvent(eventId);
    const rawLineup = await getLineup(eventId); 
    
    if (rawLineup.lineup_status !== 'confirmed') {
        logger.warn(`Lineup não confirmado para o evento ${eventId}`);
        return null;
    }
    const game = mapper.mapGame(rawGame);
    const lineup = mapper.mapLineup(rawLineup);
    
    return { game, lineup };

  } catch (error) {
        logger.error("Mensagem descritiva do que falho", error);
        throw error; 
    }  
}