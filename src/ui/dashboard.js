import blessed from "blessed";   
import { logger } from '../utils/logger.js'
import { renderHome } from "./screens/home.js";

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

menu.setContent(
`{center}{bold}SPORT MENTOR{/bold}{/center}
{center}{green-fg}v1.0.0{/green-fg}{/center}

 > Home
   Partidas
   Top Partidas
   Análise
   Tips
   Config`
);
    await renderHome(content);
        
    screen.render(); 
  } catch (error) {
    logger.error(``, error);
    } 
}
