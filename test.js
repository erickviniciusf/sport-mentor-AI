import { getMatchesOfDay } from './src/services/matchService.js';

const matches = await getMatchesOfDay();
console.log('Data enviada para BSD:', new Date().toISOString().slice(0, 10));
console.log('Primeiro jogo:', matches[0]?.event_date, matches[0]?.home_team);