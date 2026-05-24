import { getMatchesOfDay } from "../../services/matchService.js";
import { logger } from "../../utils/logger.js";

export async function renderTopPartidas(content) {
    try {
        const matches = await getMatchesOfDay();
        const topLeagues = [1, 3, 5, 34];
        const topMatches = matches.filter(match => topLeagues.includes(match.league_id));
        const lista = topMatches.map(match => {
            return `${match.home_team} vs ${match.away_team} | ${match.event_date.slice(11, 16)} | ${match.status}`;
        }).join('\n');
        
        content.setContent(lista || 'Nenhuma partida top hoje.');
    } catch (error) {
        logger.error('Erro ao renderizar top partidas', error);
    }
}