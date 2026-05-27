import { logger } from '../utils/logger.js';
import { getEvents } from '../providers/bsd/client.js';
import { incrementMatches } from '../ui/state.js'; 

export async function getMatchesOfDay(date = null) {
  try {
    const MatchDate = date || new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      .split('/')
      .reverse()
      .join('-');

    const rawMatches = await getEvents(MatchDate);

    
    if (rawMatches && Array.isArray(rawMatches.results)) {
      incrementMatches(rawMatches.results.length);
    }

    return rawMatches.results; 
  } catch (error) {
    logger.error("Erro ao buscar partidas", error);
    throw error; 
  } 
}