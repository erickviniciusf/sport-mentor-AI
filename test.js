import { getPlayerContext } from './src/providers/bsd/adapter.js';

const context = await getPlayerContext(9244);
console.log('Home stats count:', context.homeStats.length);
console.log('Away stats count:', context.awayStats.length);
console.log('Primeiro jogador:', context.homeStats[0]);