import { getMatchesOfDay } from "../../services/matchService.js"; 
import { logger } from "../../utils/logger.js";

export async function renderPartidas(content) {
    try { 
        const matches = await getMatchesOfDay(); // busca jogos
        const lista = matches.map(match => {
               return `${match.home_team} vs ${match.away_team} | ${match.event_date.slice(11, 16)} | ${match.status}`;
                }).join('\n');
        content.setContent(lista);
    }  catch (error) {
        logger.error('Erro ao renderizar home', error);
    }
}