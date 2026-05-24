import { getMatchesOfDay } from './src/services/matchService.js';

const matches = await getMatchesOfDay();
console.log(`Total de jogos hoje: ${matches.length}`);
console.log(matches[0]);