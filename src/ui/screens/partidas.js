import { getMatchesOfDay } from "../../services/matchService.js"; 
import { logger } from "../../utils/logger.js";
import { setPopupAberto } from "../dashboard.js";

let pulseInterval = null;
let dataExibida = null;
let matchesCache = null;

function buildLista(matches, pulseVisible) {
    return matches.map(match => {
        let indicador, statusPT;
        
        if (match.status === 'notstarted') {
            indicador = '{white-fg}[○]{/white-fg}';
            statusPT = 'EM BREVE';
        } else if (match.status === 'finished' || match.status === 'cancelled') {
            indicador = '{gray-fg}[✓]{/gray-fg}';
            statusPT = 'ENCERRADO';
        } else {
            indicador = pulseVisible ? '{green-fg}[●]{/green-fg}' : '{green-fg}[ ]{/green-fg}';
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
        return `${indicador} ${jogo} ${horarioFormatado}   ${statusPT}${placar}`;
    }).join('\n');
}

function getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        .split('/')
        .reverse()
        .join('-');
}

function showConfirmacao(content, mensagem) {
    return new Promise((resolve) => {
        setPopupAberto(true);

        const sep = '━'.repeat(80);
        const tela = 
`\n\n\n\n
{center}${sep}{/center}
{center}{yellow-fg}${mensagem}{/yellow-fg}{/center}

{center}{green-fg}[ S ]{/green-fg} SIM          {red-fg}[ N ]{/red-fg} NÃO{/center}
{center}${sep}{/center}`;

        content.setContent(tela);
        content.screen.render();

        const handler = (ch) => {
            const key = ch?.toLowerCase();
            if (key === 's') {
                content.screen.removeListener('keypress', handler);
                setPopupAberto(false);
                resolve(true);
            } else if (key === 'n') {
                content.screen.removeListener('keypress', handler);
                setPopupAberto(false);
                resolve(false);
            }
        };

        content.screen.on('keypress', handler);
    });
}

async function renderMatches(content, matches, dateLabel) {
    if (pulseInterval) {
        clearInterval(pulseInterval);
        pulseInterval = null;
    }

    const sep = '━'.repeat(120);
    const header = 
`${sep}
{center}PARTIDAS DO DIA — ${dateLabel}{/center}
${sep}\n\n`;

    let pulseVisible = true;

    const render = () => {
        content.setContent(header + buildLista(matches, pulseVisible));
        content.screen.render();
    };

    render();

    const temAoVivo = matches.some(m => !['notstarted', 'finished', 'cancelled'].includes(m.status));
    if (temAoVivo) {
        pulseInterval = setInterval(() => {
            pulseVisible = !pulseVisible;
            render();
        }, 800);
    }
}

export function resetPartidasCache() {
    dataExibida = null;
    matchesCache = null;
}

export async function renderPartidas(content, screen) {
    try { 
        if (pulseInterval) {
            clearInterval(pulseInterval);
            pulseInterval = null;
        }

        const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

        // Se já escolheu uma data, renderiza direto sem perguntar
        if (dataExibida && matchesCache) {
            await renderMatches(content, matchesCache, dataExibida);
            return;
        }

        const matches = await getMatchesOfDay();

        const nenhumJogo = !matches || matches.length === 0;
        const todosEncerrados = matches && matches.length > 0 && 
            matches.every(m => m.status === 'finished' || m.status === 'cancelled');

        if (nenhumJogo || todosEncerrados) {
            const mensagem = nenhumJogo
                ? 'Nenhum jogo encontrado hoje. Deseja ver os jogos de amanhã?'
                : 'Todos os jogos de hoje foram encerrados. Deseja ver os jogos de amanhã?';

            const resposta = await showConfirmacao(content, mensagem);

            if (resposta) {
                const amanha = getTomorrowDate();
                const matchesAmanha = await getMatchesOfDay(amanha);
                const amanhaLabel = new Date(amanha + 'T12:00:00').toLocaleDateString('pt-BR');
                dataExibida = amanhaLabel;
                matchesCache = matchesAmanha;
                await renderMatches(content, matchesAmanha, amanhaLabel);
            } else {
                dataExibida = hoje;
                matchesCache = matches;
                await renderMatches(content, matches, hoje);
            }
        } else {
            dataExibida = hoje;
            matchesCache = matches;
            await renderMatches(content, matches, hoje);
        }

    } catch (error) {
        logger.error('Erro ao renderizar partidas', error);
    }
}