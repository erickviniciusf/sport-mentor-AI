import { logger } from './src/utils/logger.js';
import { getPlayerContext } from './src/providers/bsd/adapter.js';
import { calculatePlayerConviction } from './src/engines/convictionEngine.js';

console.log('\n========================================');
console.log('  SPORTS MENTOR - TESTE SÃO PAULO vs BOTAFOGO');
console.log('========================================\n');

try {
  // ========================================
  // TESTE 1: Buscar Contexto
  // ========================================
  console.log('📍 TESTE 1: Buscando contexto do jogo...');
  const context = await getPlayerContext(7161); // São Paulo vs Botafogo
  
  if (!context) {
    console.log('❌ Contexto não encontrado ou escalação não confirmada\n');
    process.exit(1);
  }

  console.log('✅ Contexto obtido com sucesso!\n');
  console.log(`   Game: ${context.game.home_team} vs ${context.game.away_team}`);
  console.log(`   Date: ${context.game.event_date}`);
  console.log(`   Status: ${context.game.status}`);
  console.log(`   Home Formation: ${context.lineup.home.formation}`);
  console.log(`   Away Formation: ${context.lineup.away.formation}`);
  console.log(`   Home Starters: ${context.lineup.home.starters.length}`);
  console.log(`   Away Starters: ${context.lineup.away.starters.length}\n`);

  // ========================================
  // TESTE 2: Conviction Engine para 5 jogadores DO TIME DA CASA (São Paulo)
  // ========================================
  console.log('========================================');
  console.log('📊 TESTE 2: Calculando Conviction para 5 jogadores do SÃO PAULO');
  console.log('========================================\n');

  const homeStarters = context.lineup.home.starters.slice(0, 5);
  const convictions = [];

  for (let i = 0; i < homeStarters.length; i++) {
    const player = homeStarters[i];
    console.log(`\n[${i + 1}/5] Analisando: ${player.name}`);
    console.log(`     ID: ${player.id} | Position: ${player.position}\n`);

    try {
      const conviction = await calculatePlayerConviction(context, player.id, 'shots');

      if (conviction) {
        convictions.push(conviction);

        console.log(`     ✅ CONVICTION: ${conviction.score}/100`);
        console.log(`     📈 Factors:`);
        conviction.factors.forEach(factor => {
          console.log(`        ${factor}`);
        });
        console.log(`     📝 ${conviction.explanation}\n`);
      } else {
        console.log(`     ⚠️  Conviction retornou null\n`);
      }
    } catch (error) {
      console.log(`     ❌ Erro: ${error.message}\n`);
    }
  }

  // ========================================
  // TESTE 3: Resumo Comparativo
  // ========================================
  console.log('\n========================================');
  console.log('📊 RESUMO COMPARATIVO - TOP 5 JOGADORES DO SÃO PAULO');
  console.log('========================================\n');

  // Ordenar por conviction decrescente
  const sorted = [...convictions].sort((a, b) => b.score - a.score);

  console.log('🥇 RANKING (Mercado: SHOTS)\n');
  sorted.forEach((conv, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
    console.log(`${medal} #${index + 1} - ${conv.playerName.padEnd(20)} | Score: ${String(conv.score).padStart(3)}/100`);
  });

  // ========================================
  // TESTE 4: Estatísticas
  // ========================================
  console.log('\n========================================');
  console.log('📈 ESTATÍSTICAS');
  console.log('========================================\n');

  const avgScore = (convictions.reduce((sum, c) => sum + c.score, 0) / convictions.length).toFixed(2);
  const maxScore = Math.max(...convictions.map(c => c.score));
  const minScore = Math.min(...convictions.map(c => c.score));

  console.log(`   Total de jogadores analisados: ${convictions.length}`);
  console.log(`   Conviction média: ${avgScore}`);
  console.log(`   Conviction máxima: ${maxScore} (${convictions.find(c => c.score === maxScore)?.playerName})`);
  console.log(`   Conviction mínima: ${minScore} (${convictions.find(c => c.score === minScore)?.playerName})`);
  
  const strongCount = convictions.filter(c => c.score >= 75).length;
  const goodCount = convictions.filter(c => c.score >= 60 && c.score < 75).length;
  const weakCount = convictions.filter(c => c.score < 40).length;

  console.log(`\n   Força:
     🟢 Forte (>=75): ${strongCount}
     🟡 Bom (60-74): ${goodCount}
     🔴 Fraco (<40): ${weakCount}\n`);

  // ========================================
  // TESTE 5: Detalhes de um jogador específico
  // ========================================
  if (convictions.length > 0) {
    const topPlayer = convictions[0];
    console.log('========================================');
    console.log('🔍 ANÁLISE DETALHADA DO TOP 1');
    console.log('========================================\n');
    console.log(`Player: ${topPlayer.playerName}`);
    console.log(`Market: ${topPlayer.market}`);
    console.log(`Conviction Score: ${topPlayer.score}/100\n`);
    console.log('Fatores Considerados:');
    topPlayer.factors.forEach((factor, i) => {
      const symbol = factor.includes('+') ? '✅' : '❌';
      console.log(`  ${symbol} ${factor}`);
    });
    console.log(`\nExplicação:\n"${topPlayer.explanation}"\n`);
  }

  // ========================================
  // TESTE 6: Testar também o time VISITANTE (Botafogo)
  // ========================================
  console.log('========================================');
  console.log('📊 TESTE 3: TOP 5 DO BOTAFOGO (VISITANTE)');
  console.log('========================================\n');

  const awayStarters = context.lineup.away.starters.slice(0, 5);
  const awayConvictions = [];

  for (let i = 0; i < awayStarters.length; i++) {
    const player = awayStarters[i];
    console.log(`[${i + 1}/5] ${player.name} (${player.position})...`);

    try {
      const conviction = await calculatePlayerConviction(context, player.id, 'shots');
      if (conviction) {
        awayConvictions.push(conviction);
        console.log(`     ✅ Score: ${conviction.score}/100\n`);
      }
    } catch (error) {
      console.log(`     ❌ Erro\n`);
    }
  }

  if (awayConvictions.length > 0) {
    const sortedAway = [...awayConvictions].sort((a, b) => b.score - a.score);
    console.log('\n🥇 RANKING BOTAFOGO (Mercado: SHOTS)\n');
    sortedAway.forEach((conv, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      console.log(`${medal} #${index + 1} - ${conv.playerName.padEnd(20)} | Score: ${String(conv.score).padStart(3)}/100`);
    });
  }

  console.log('\n========================================');
  console.log('✅ TESTES CONCLUÍDOS COM SUCESSO');
  console.log('========================================\n');

} catch (error) {
  console.error('\n❌ ERRO CRÍTICO:', error.message);
  console.error(error);
  process.exit(1);
}