import blessed from "blessed";   
import { logger } from '../utils/logger.js'
import { renderHome } from "./screens/home.js";
import { renderPartidas } from "./screens/partidas.js";

export async function startDashboard() {
  try { 
    const screen = blessed.screen({
    smartCSR: true,
    title: 'Sport Mentor v1.0.0'
}); 
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

    const content = blessed.box({
    top: 0,
    left: '20%',
    width: '80%',
    height: '100%', 
    tags: true,
    border: { type: 'line' },
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
:`${item}`;
    }).join('\n');
    
    menu.setContent(
`{center}{bold}SPORT MENTOR{/bold}{/center}
{center}{green-fg}v1.0.0{/green-fg}{/center}
${items}`
    );
    }
    renderMenu(); 
        screen.key(['up', 'k'], () => {
    selectedIndex = (selectedIndex - 1 + menuItems.length) % menuItems.length;
    renderMenu();
    screen.render();
});

    screen.key(['down', 'j'], () => {
    selectedIndex = (selectedIndex + 1) % menuItems.length;
    renderMenu();
    screen.render();
});

    screen.key(['enter'], async () => {
    const selected = menuItems[selectedIndex];
    if (selected === 'Home') await renderHome(content);
    if (selected === 'Partidas') await renderPartidas(content);
    screen.render();
});
    await renderHome(content);
        
    screen.render(); 
    } catch (error) {
    logger.error(``, error);
    } 
}
