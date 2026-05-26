import blessed from "blessed";   
import { logger } from '../utils/logger.js'
import { renderHome } from "./screens/home.js";
import { renderPartidas, resetPartidasCache } from "./screens/partidas.js";
import { renderTopPartidas } from "./screens/topPartidas.js";
import { renderTips } from "./screens/tips.js";
import { renderAnalise } from "./screens/analise.js";

export let popupAberto = false;
export function setPopupAberto(val) { popupAberto = val; }

export let focoNaLista = false;
export function setFocoNaLista(val) { focoNaLista = val; }

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

        screen.key(['up', 'k'], () => {
            if (popupAberto) return;
            if (focoNaLista) return;
            selectedIndex = (selectedIndex - 1 + menuItems.length) % menuItems.length;
            renderMenu();
            screen.render();
        });

        screen.key(['down', 'j'], () => {
            if (popupAberto) return;
            if (focoNaLista) return;
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

            if (selected === 'Home') await renderHome(content);
            if (selected === 'Partidas') await renderPartidas(content, screen);
            if (selected === 'Top Partidas') await renderTopPartidas(content);
            if (selected === 'Tips') await renderTips(content);
            if (selected === 'Análise') await renderAnalise(content);
            
            screen.render();
        });

        await renderHome(content);

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

    } catch (error) {
        logger.error(``, error);
    } 
}