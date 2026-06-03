/**
 * Test — Event-Driven Architecture Demo
 * 
 * Demonstra como o EventBus desacopla Monitor Service e Dashboard
 * Execute: node test-events.js
 */

import { eventBus, EVENTS } from './src/core/index.js';
import { logger } from './src/utils/logger.js';

console.log('\n🔴 === EVENT-DRIVEN ARCHITECTURE DEMO ===\n');

// ===== SIMULANDO MONITOR SERVICE =====
console.log('📊 Monitor Service listening...');

// Dashboard escuta atualizações de partidas
eventBus.on(EVENTS.MATCH_LIST_UPDATED, ({ matches, count, timestamp }) => {
  console.log(`\n✅ [DASHBOARD] Received MATCH_LIST_UPDATED event`);
  console.log(`   └─ ${count} matches available`);
  console.log(`   └─ timestamp: ${new Date(timestamp).toISOString()}`);
});

// Dashboard escuta novos lineups
eventBus.on(EVENTS.LINEUP_CONFIRMED, ({ homeTeam, awayTeam, matchId, timestamp }) => {
  console.log(`\n✅ [DASHBOARD] Received LINEUP_CONFIRMED event`);
  console.log(`   └─ ${homeTeam} vs ${awayTeam} (Match #${matchId})`);
  console.log(`   └─ timestamp: ${new Date(timestamp).toISOString()}`);
});

// Dashboard escuta erros
eventBus.on(EVENTS.ERROR_OCCURRED, ({ type, message, timestamp }) => {
  console.log(`\n⚠️  [DASHBOARD] Received ERROR_OCCURRED event`);
  console.log(`   └─ type: ${type}`);
  console.log(`   └─ message: ${message}`);
});

// Dashboard escuta conclusão de ciclos
eventBus.on(EVENTS.MONITOR_CYCLE_COMPLETE, ({ matchesProcessed, newLineupsFound, timestamp }) => {
  console.log(`\n📈 [DASHBOARD] Received MONITOR_CYCLE_COMPLETE event`);
  console.log(`   └─ Matches processed: ${matchesProcessed}`);
  console.log(`   └─ New lineups: ${newLineupsFound}`);
});

// ===== SIMULANDO EMISSÃO DE EVENTOS =====
console.log('\n\n🎬 Simulating Monitor Service events...\n');

// Evento 1: Monitor iniciado
setTimeout(() => {
  console.log('→ Emitting MONITOR_STARTED');
  eventBus.emit(EVENTS.MONITOR_STARTED, {
    timestamp: Date.now()
  });
}, 500);

// Evento 2: Lista de partidas atualizada
setTimeout(() => {
  console.log('→ Emitting MATCH_LIST_UPDATED');
  eventBus.emit(EVENTS.MATCH_LIST_UPDATED, {
    matches: [
      { id: 1, home_team: 'Flamengo', away_team: 'Vasco' },
      { id: 2, home_team: 'São Paulo', away_team: 'Corinthians' },
      { id: 3, home_team: 'Palmeiras', away_team: 'Santos' }
    ],
    count: 3,
    timestamp: Date.now()
  });
}, 1000);

// Evento 3: Novo lineup confirmado
setTimeout(() => {
  console.log('→ Emitting LINEUP_CONFIRMED');
  eventBus.emit(EVENTS.LINEUP_CONFIRMED, {
    matchId: 1,
    homeTeam: 'Flamengo',
    awayTeam: 'Vasco',
    timestamp: Date.now()
  });
}, 1500);

// Evento 4: Outro lineup
setTimeout(() => {
  console.log('→ Emitting LINEUP_CONFIRMED');
  eventBus.emit(EVENTS.LINEUP_CONFIRMED, {
    matchId: 2,
    homeTeam: 'São Paulo',
    awayTeam: 'Corinthians',
    timestamp: Date.now()
  });
}, 2000);

// Evento 5: Ciclo concluído
setTimeout(() => {
  console.log('→ Emitting MONITOR_CYCLE_COMPLETE');
  eventBus.emit(EVENTS.MONITOR_CYCLE_COMPLETE, {
    matchesProcessed: 3,
    newLineupsFound: 2,
    timestamp: Date.now()
  });
}, 2500);

// Evento 6: Erro simulado
setTimeout(() => {
  console.log('→ Emitting ERROR_OCCURRED');
  eventBus.emit(EVENTS.ERROR_OCCURRED, {
    type: 'monitor:api_error',
    message: 'Failed to connect to BSD API',
    timestamp: Date.now()
  });
}, 3000);

// Finalizar
setTimeout(() => {
  console.log('\n\n🎯 Demo finished! All events were processed reactively.\n');
  console.log('Key takeaway:');
  console.log('✓ Monitor Service emits events without knowing who listens');
  console.log('✓ Dashboard listens without knowing the implementation details');
  console.log('✓ Zero coupling — they can evolve independently\n');
  process.exit(0);
}, 3500);
