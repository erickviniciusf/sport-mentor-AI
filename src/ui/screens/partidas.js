import { getMatchesOfDay } from "../../services/matchService.js"; 
import { logger } from "../../utils/logger.js";

export async function renderPartidas(content) {
    try { 
        const hoje = new Date().toLocaleDateString('pt-BR');
        const matches = await getMatchesOfDay(); // busca jogos
        const lista = matches.map(match => {
    let indicador, statusPT;
    
    if (match.status === 'notstarted') {
        indicador = '{white-fg}[○]{/white-fg}';
        statusPT = 'EM BREVE';
    } else if (match.status === 'finished' || match.status === 'cancelled') {
        indicador = '{gray-fg}[✓]{/gray-fg}';
        statusPT = 'ENCERRADO';
    } else {
        indicador = '{green-fg}[●]{/green-fg}';
        statusPT = 'AO VIVO';
    }
    
    const horario = match.event_date.slice(11, 16);
    const jogo = `${match.home_team} vs ${match.away_team}`.padEnd(45);
    const placar = (match.status === 'finished' && match.home_score !== null)
    ? `  ${match.home_score}-${match.away_score}`
    : '';
    
    return `${indicador} ${jogo} ${horario}   ${statusPT}${placar}`;
}).join('\n');
        const sep = '━'.repeat(120);
const header = 
`${sep}
{center}PARTIDAS DO DIA — ${hoje}{/center}
${sep}\n\n`;
content.setContent(header + lista);
    }  catch (error) {
        logger.error('Erro ao renderizar home', error);
    }
}