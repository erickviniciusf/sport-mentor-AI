import blessed from "blessed";   
import { logger } from '../utils/logger.js'
import { eventBus, EVENTS } from '../core/index.js';
import { renderHome } from "./screens/home.js";
import { renderPartidas, resetPartidasCache } from "./screens/partidas.js";
import { renderTopPartidas } from "./screens/topPartidas.js";
import { renderTips, navigateTips } from "./screens/tips.js";
import { renderAnalise } from "./screens/analise.js";

export let popupAberto = false;
export function setPopupAberto(val) { popupAberto = val; }

export let focoNaLista = false;
export function setFocoNaLista(val) { focoNaLista = val; }

// ===== ESTADO PARA NAVEGAÇÃO DE TIPS =====
export let telaAtual = 'Home';
export function setTelaAtual(tela) { telaAtual = tela; }

export let tipSelectedIndex = 0;
export function setTipSelectedIndex(index) { tipSelectedIndex = index; }

export async function startDashboard() {
    try { 
        const screen = blessed.screen({
            smartCSR: true,
            title: 'Sport Mentor v1.0.0',
            fullUnicode: true
        }); 

        const originalWrite = process.stdout.write.bind(process.stdout);
        process.stdout.write = (chunk, encoding, callback) => {
            if (typeof chunk === 'string' && !chunk.includes('\x1b')) return true;
            return originalWrite(chunk, encoding, callback);
        };

        screen.key(['q', 'C-c'], () => process.exit(0));
        
        const menu = blessed.box({
            top: 0,
            left: 0,
            width: '20%',
            height: '100%',
            border: { type: 'line' },
            tags: true,
            style: {
                border: { fg: 'green' },
                fg: 'white',
                bg: 'black'
            }
        });
        screen.append(menu);

        let content = blessed.box({
            top: 0,
            left: '20%',
            width: '80%',
            height: '100%', 
            tags: true,
            border: { type: 'line' },
            scrollable: true,
            mouse: true,
            keys: true,
            vi: true,
            style: {
                border: { fg: 'green' },
                fg: 'white',
                bg: 'black'
            }
        });
        screen.append(content);

        const menuItems = ['Home', 'Partidas', 'Top Partidas', 'Análise', 'Tips', 'Config'];
        let selectedIndex = 0;

        function renderMenu() {
            const items = menuItems.map((item, index) => {
                return index === selectedIndex 
                    ? ` {green-fg}> ${item}{/green-fg}`
                    : ` ${item}`;
            }).join('\n');
            
            menu.setContent(
`{center}{bold}SPORT MENTOR{/bold}{/center}
{center}{green-fg}v1.0.0{/green-fg}{/center}

${items}`
            );
        }

        renderMenu(); 

        // ===== EVENT LISTENERS — Sincronizar com dados em tempo real =====
        
        // Quando monitor atualiza lista de partidas
        eventBus.on(EVENTS.MATCH_LIST_UPDATED, async ({ matches, count }) => {
            logger.info('Dashboard: match list updated', { count });
            
            // Se estamos na tela Partidas, atualizar
            if (telaAtual === 'Partidas') {
                try {
                    await renderPartidas(content, screen);
                    screen.render();
                } catch (err) {
                    logger.error('Error updating Partidas display', { error: err.message });
                }
            }
        });

        // Quando um novo lineup é confirmado
        eventBus.on(EVENTS.LINEUP_CONFIRMED, ({ homeTeam, awayTeam, matchId }) => {
            logger.info('Dashboard: new lineup confirmed', { matchId, homeTeam, awayTeam });
            
            // Se estamos na tela Home, mostrar notificação
            if (telaAtual === 'Home') {
                // Poderia emitir visual feedback aqui
            }
        });

        // Quando análise é completa
        eventBus.on(EVENTS.ANALYSIS_COMPLETE, ({ tips, convictions }) => {
            logger.info('Dashboard: analysis complete', { 
                tipsGenerated: tips.length,
                playersAnalyzed: convictions.length 
            });
            
            // Se estamos em Tips, atualizar
            if (telaAtual === 'Tips') {
                try {
                    // Renderizar tips será acionado pela UI de Tips
                } catch (err) {
                    logger.error('Error updating Tips display', { error: err.message });
                }
            }
        });

        // Erro no monitor
        eventBus.on(EVENTS.ERROR_OCCURRED, ({ type, message }) => {
            logger.warn('Dashboard: error event received', { type, message });
            // Poderia mostrar notificação visual ao usuário
        });

        // ===== NAVEGAÇÃO DO MENU (UP/DOWN) =====
        screen.key(['up', 'k'], async () => {
            if (popupAberto) return;
            if (focoNaLista) return;
            
            // Se estiver em TIPS, usar navegação de tips ao invés de menu
            if (telaAtual === 'Tips') {
                tipSelectedIndex = await navigateTips(content, 'up', tipSelectedIndex);
                screen.render();
                return;
            }

            // Caso contrário, navegar no menu
            selectedIndex = (selectedIndex - 1 + menuItems.length) % menuItems.length;
            renderMenu();
            screen.render();
        });

        screen.key(['down', 'j'], async () => {
            if (popupAberto) return;
            if (focoNaLista) return;
            
            // Se estiver em TIPS, usar navegação de tips ao invés de menu
            if (telaAtual === 'Tips') {
                tipSelectedIndex = await navigateTips(content, 'down', tipSelectedIndex);
                screen.render();
                return;
            }

            // Caso contrário, navegar no menu
            selectedIndex = (selectedIndex + 1) % menuItems.length;
            renderMenu();
            screen.render();
        });

        screen.key(['escape'], () => {
            if (focoNaLista) {
                setFocoNaLista(false);
                renderMenu();
                screen.render();
            }
        });

        screen.key(['enter'], async () => {
            if (popupAberto) return;
            if (focoNaLista) return;
            const selected = menuItems[selectedIndex];

            screen.remove(content);
            content = blessed.box({
                top: 0,
                left: '20%',
                width: '80%',
                height: '100%', 
                tags: true,
                border: { type: 'line' },
                scrollable: true,
                mouse: true,
                keys: true,
                vi: true,
                style: {
                    border: { fg: 'green' },
                    fg: 'white',
                    bg: 'black'
                }
            });
            screen.append(content);

            // ===== RENDERIZAR TELA SELECIONADA =====
            if (selected === 'Home') {
                setTelaAtual('Home');
                await renderHome(content);
            }
            if (selected === 'Partidas') {
                setTelaAtual('Partidas');
                resetPartidasCache();
                await renderPartidas(content, screen);
            }
            if (selected === 'Top Partidas') {
                setTelaAtual('Top Partidas');
                await renderTopPartidas(content);
            }
            if (selected === 'Tips') {
                setTelaAtual('Tips');
                tipSelectedIndex = 0; // Reset ao entrar em TIPS
                await renderTips(content);
            }
            if (selected === 'Análise') {
                setTelaAtual('Análise');
                await renderAnalise(content);
            }
            
            screen.render();
        });

        await renderHome(content);

        // ===== LOOP DE ATUALIZAÇÃO (Partidas a cada 1s) =====
        setInterval(async () => {
            try {
                if (popupAberto) return;
                if (focoNaLista) return;
                const selectedText = menuItems[selectedIndex];
                if (selectedText === 'Partidas') {
                    await renderPartidas(content, screen); 
                    screen.render(); 
                }
            } catch (err) {
                logger.error('Erro no loop de renderização:', err);
            }
        }, 1000);

        screen.render(); 

        logger.info('Dashboard started successfully', {
            timestamp: Date.now()
        });

    } catch (error) {
        logger.error(`Erro ao iniciar dashboard`, { 
            error: error.message,
            timestamp: Date.now()
        });
    } 
}