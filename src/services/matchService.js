import { logger } from '../utils/logger.js';
import { getEvents } from '../providers/bsd/client.js';

export async function getMatchesOfDay(date = null) {
  try {
    const MatchDate = date || new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      .split('/')
      .reverse()
      .join('-');

    const rawMatches = await getEvents(MatchDate);
    return rawMatches.results; 
  } catch (error) {
    logger.error("Erro ao buscar partidas", error);
    throw error; 
  } 
}