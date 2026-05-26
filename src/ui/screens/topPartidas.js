import { getMatchesOfDay } from "../../services/matchService.js";
import { logger } from "../../utils/logger.js";
import { setFocoNaLista } from "../dashboard.js";

const TOP_LEAGUES = {
    1:  'Premier League',
    2:  'Liga Portugal',
    3:  'La Liga',
    4:  'Serie A',
    5:  'Bundesliga',
    6:  'Ligue 1',
    7:  'Champions League',
    8:  'Europa League',
    9:  'Brasileirão A',
    10: 'Eredivisie',
    13: 'Scottish Prem.',
    14: 'Pro League',
    17: 'Saudi Pro League',
    19: 'Liga MX',
    20: 'Liga MX',
    27: 'World Cup 2026',
    32: 'Copa Libertadores',
    33: 'Copa Sudamericana',
    35: 'Copa do Brasil',
};

export async function renderTopPartidas(content) {
    try {
        const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const matches = await getMatchesOfDay();

        // Filtra apenas ligas top
        const topMatches = matches.filter(match => TOP_LEAGUES[match.league_id]);

        const sep = '━'.repeat(120);
        const header = 
`${sep}
{center}TOP PARTIDAS DO DIA — ${hoje}{/center}
${sep}\n\n`;

        if (topMatches.length === 0) {
            content.setContent(header + '{center}{yellow-fg}Nenhuma partida top encontrada hoje.{/yellow-fg}{/center}');
            return;
        }

        const lista = topMatches.map(match => {
            let indicador, statusPT;

            if (match.status === 'notstarted') {
                indicador = '{white-fg}[○]{/white-fg}';
                statusPT = 'EM BREVE';
            } else if (match.status === 'finished' || match.status === 'cancelled') {
                indicador = '{gray-fg}[✓]{/gray-fg}';
                statusPT = 'ENCERRADO';
            } else {
                indicador = '{green-fg}[●]{/green-fg}';
                statusPT = '{green-fg}AO VIVO{/green-fg}';
            }

            const horario = match.status === 'notstarted'
                ? new Date(match.event_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                : `${match.current_minute}'`;

            const jogo = `${match.home_team} vs ${match.away_team}`.padEnd(45);
            const placar = (['finished', '1st_half', 'halftime', '2nd_half'].includes(match.status) && match.home_score !== null)
                ? `  ${match.home_score}-${match.away_score}`
                : '';

            const horarioFormatado = horario.padStart(6);
            const liga = `{cyan-fg}[${TOP_LEAGUES[match.league_id]}]{/cyan-fg}`;

            return `${indicador} ${jogo} ${horarioFormatado}   ${statusPT}${placar}  ${liga}`;
        }).join('\n');

        content.setContent(header + lista);

    } catch (error) {
        logger.error('Erro ao renderizar top partidas', error);
        content.setContent('{red-fg}Erro ao carregar top partidas. Verifique os logs.{/red-fg}');
    }
}