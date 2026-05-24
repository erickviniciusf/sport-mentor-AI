import { logger } from '../utils/logger.js';
import { getEvents } from '../providers/bsd/client.js';

export async function getMatchesOfDay() {
  try {
    const MatchDate= new Date().toISOString().slice(0, 10);

    const rawMatches = await getEvents(MatchDate);

     return rawMatches.results; 
  } catch (error) {
        logger.error("Mensagem descritiva do que falho", error);
        throw error; 
        } 
}  