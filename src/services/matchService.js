import { logger } from '../utils/logger.js';
import { getEvents } from '../providers/bsd/client.js';
import { incrementMatches } from '../ui/state.js'; 

export async function getMatchesOfDay(date) {
  try {
    // Monta a data de hoje em Brasília se não receber parâmetro
    const dateBR = date || new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      .split('/')
      .reverse()
      .join('-');

    // Brasília é UTC-3: dia de Brasília vai de 03:00 UTC até 02:59 UTC do dia seguinte
    const dateFrom = `${dateBR}T03:00:00`;
    const nextDay = new Date(dateBR + 'T12:00:00');
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().slice(0, 10);
    const dateTo = `${nextDayStr}T06:00:00`;

    const rawMatches = await getEvents(dateFrom, dateTo);

    const matchesDoDia = rawMatches.results.filter(match => {
    const dataJogoBR = new Date(match.event_date).toLocaleDateString('pt-BR', { 
        timeZone: 'America/Sao_Paulo' 
    });
    const dataJogoBRFormatada = dataJogoBR.split('/').reverse().join('-');
    return dataJogoBRFormatada === dateBR; // ← agora compara com a data correta
});
    
    if (rawMatches && Array.isArray(rawMatches.results)) {
      incrementMatches(rawMatches.results.length);
    }

    return matchesDoDia; 
  } catch (error) {
    logger.error("Erro ao buscar partidas", error);
    throw error; 
  } 
}