import { getMatchContext } from './src/services/aiService.js';

const result = await getMatchContext('São Paulo', 'Botafogo');
console.log('ANÁLISE:');
console.log(result.analysis);
console.log('\nFONTES:');
result.sources.forEach(s => console.log('·', s));