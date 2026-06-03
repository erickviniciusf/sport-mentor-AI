import { getMatchesOfDay } from "../../services/matchService.js";
import { logger } from "../../utils/logger.js";
import { setPopupAberto, setFocoNaLista } from "../dashboard.js";
import { getMatchContext } from "../../services/aiService.js";
import blessed from "blessed";

let pulseInterval = null;
let dataExibida = null;
let matchesCache = null;
let selectedIndex = 0;
let aiTimeout = null;
let navHandler = null;

function buildLista(matches, pulseVisible, selected) { // recebe o índice do jogo selecionado
    return matches.map((match, index) => {
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
        const linha = `${indicador} ${jogo} ${horarioFormatado}   ${statusPT}${placar}`;

        return index === selected
            ? `{green-bg}{black-fg}${linha}{/black-fg}{/green-bg}`
            : linha;
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

async function renderMatches(content, matches, dateLabel, screen) {
    if (pulseInterval) {
        clearInterval(pulseInterval);
        pulseInterval = null;
    }

    // Remove handler anterior se existir
    if (navHandler) {
        screen.removeListener('keypress', navHandler);
        navHandler = null;
    }

    content.children?.slice().forEach(child => content.remove(child));

    const sep = '━'.repeat(60);

    const listaBox = blessed.box({
        top: 0,
        left: 0,
        width: '50%',
        height: '100%',
        tags: true,
        scrollable: true,
        keys: true,
        mouse: true,
        style: { fg: 'white', bg: 'black' }
    });

    const analiseBox = blessed.box({
        top: 0,
        left: '50%',
        width: '50%',
        height: '100%',
        tags: true,
        scrollable: true,
        border: { type: 'line' },
        style: { fg: 'white', bg: 'black', border: { fg: 'cyan' } }
    });

    content.append(listaBox);
    content.append(analiseBox);

    const header = `${sep}\n{center}PARTIDAS — ${dateLabel}{/center}\n${sep}\n\n`;

    let pulseVisible = true;
    selectedIndex = 0;

    const renderLista = () => {
        listaBox.setContent(header + buildLista(matches, pulseVisible, selectedIndex));
        screen.render();
    };

    const carregarAnalise = async (match) => {
        analiseBox.setContent(`{center}{yellow-fg}Buscando contexto...{/yellow-fg}{/center}\n\n${match.home_team} vs ${match.away_team}`);
        screen.render();

        const ctx = await getMatchContext(match.home_team, match.away_team);

        analiseBox.setContent(
            `{center}{cyan-fg}━━ ANÁLISE IA ━━{/cyan-fg}{/center}
{bold}${match.home_team} vs ${match.away_team}{/bold}

${ctx.analysis}

{gray-fg}Fontes: ${ctx.sources.slice(0, 2).join(' | ')}{/gray-fg}`
        );
        screen.render();
    };

    renderLista();

    if (matches.length > 0) {
        carregarAnalise(matches[0]);
    }

    // Ativa foco na lista
    setFocoNaLista(true);

    navHandler = (ch, key) => {
        if (!key) return;

        if (key.name === 'escape') {
            setFocoNaLista(false);
            if (navHandler) {
                screen.removeListener('keypress', navHandler);
                navHandler = null;
            }
            return;
        }

        if (key.name === 'up') {
            if (selectedIndex > 0) {
                selectedIndex--;
                renderLista();
                if (aiTimeout) clearTimeout(aiTimeout);
                aiTimeout = setTimeout(() => carregarAnalise(matches[selectedIndex]), 500);
            }
        } else if (key.name === 'down') {
            if (selectedIndex < matches.length - 1) {
                selectedIndex++;
                renderLista();
                if (aiTimeout) clearTimeout(aiTimeout);
                aiTimeout = setTimeout(() => carregarAnalise(matches[selectedIndex]), 500);
            }
        }
    };

    screen.on('keypress', navHandler);

    const temAoVivo = matches.some(m => !['notstarted', 'finished', 'cancelled'].includes(m.status));
    if (temAoVivo) {
        pulseInterval = setInterval(() => {
            pulseVisible = !pulseVisible;
            renderLista();
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

        const fusoBR = 'America/Sao_Paulo'; // Definindo o fuso horário para Brasil 

        function formatBR(date) {
            return date
                .toLocaleDateString('pt-BR', { timeZone: fusoBR })
                .split('/')
                .reverse()
                .join('-');
        }

        const hojeDate = new Date();
        const hojeBR = formatBR(hojeDate);

        if (dataExibida && matchesCache) {
            await renderMatches(content, matchesCache, dataExibida, screen);
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

                // Calcula a data de amanhã em PT-BR
                const amanhaObj = new Date(amanha + 'T12:00:00');
                const amanhaBR = formatBR(amanhaObj);

                // Só jogos do dia correto de amanhã
                const matchesAmanhaHoje = matchesAmanha.filter(m => {
                    const eventDateObj = new Date(m.event_date);
                    const localDate = formatBR(eventDateObj);
                    return localDate === amanhaBR;
                });

                const amanhaLabel = new Date(amanha + 'T12:00:00').toLocaleDateString('pt-BR', { timeZone: fusoBR });
                dataExibida = amanhaLabel;
                matchesCache = matchesAmanhaHoje;
                await renderMatches(content, matchesAmanhaHoje, amanhaLabel, screen);
            } else {
                dataExibida = hojeDate.toLocaleDateString('pt-BR', { timeZone: fusoBR });
                matchesCache = matches;
                await renderMatches(content, matches, dataExibida, screen);
            }
        } else {
            dataExibida = hojeDate.toLocaleDateString('pt-BR', { timeZone: fusoBR });
            matchesCache = matches;
            await renderMatches(content, matches, dataExibida, screen);
        }

    } catch (error) {
        logger.error('Erro ao renderizar partidas', error);
    }
}