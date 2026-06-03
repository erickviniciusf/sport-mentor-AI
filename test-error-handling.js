/**
 * Test — Centralized Error Handling Demo
 * 
 * Demonstra os diferentes tipos de erros e como são tratados
 * Execute: node test-error-handling.js
 */

import { 
  AppError, 
  ValidationError, 
  APIError, 
  NotFoundError,
  NetworkError,
  TimeoutError,
  handleError,
  withRetry
} from './src/core/index.js';

import { eventBus, EVENTS } from './src/core/index.js';
import { logger } from './src/utils/logger.js';

console.log('\n🔴 === CENTRALIZED ERROR HANDLING DEMO ===\n');

// Setup: escutar eventos de erro
eventBus.on(EVENTS.ERROR_OCCURRED, ({ error, timestamp }) => {
  console.log(`\n📢 [ERROR EVENT] ${error.code}`);
  console.log(`   └─ Message: ${error.message}`);
  console.log(`   └─ Status: ${error.statusCode}`);
  console.log(`   └─ Context: ${JSON.stringify(error.context)}`);
});

// ===== TESTE 1: Validation Error =====
console.log('\n🧪 Test 1: ValidationError');
console.log('→ User submits empty form');
try {
  const username = '';
  if (!username) {
    throw new ValidationError(
      'Username is required',
      { field: 'username', value: username }
    );
  }
} catch (error) {
  handleError(error, { operation: 'user_registration' });
}

// ===== TESTE 2: API Error =====
console.log('\n🧪 Test 2: APIError');
console.log('→ API returns 429 (Too Many Requests)');
try {
  throw new APIError(
    'Rate limit exceeded on BSD API',
    429,
    { endpoint: '/api/v2/events', retryAfter: '60s' }
  );
} catch (error) {
  handleError(error, { operation: 'fetch_matches' });
}

// ===== TESTE 3: Not Found Error =====
console.log('\n🧪 Test 3: NotFoundError');
console.log('→ Trying to fetch non-existent match');
try {
  throw new NotFoundError('Match', 999999);
} catch (error) {
  handleError(error, { operation: 'fetch_match' });
}

// ===== TESTE 4: Network Error =====
console.log('\n🧪 Test 4: NetworkError');
console.log('→ Failed to connect to BSD API');
try {
  throw new NetworkError(
    'ECONNREFUSED: Connection refused to sports.bzzoiro.com:443',
    { host: 'sports.bzzoiro.com', port: 443 }
  );
} catch (error) {
  handleError(error, { operation: 'api_connect' });
}

// ===== TESTE 5: Timeout Error =====
console.log('\n🧪 Test 5: TimeoutError');
console.log('→ Request takes too long');
try {
  throw new TimeoutError('fetchPlayerStats', 15000, { playerId: 12345 });
} catch (error) {
  handleError(error, { operation: 'fetch_player_stats' });
}

// ===== TESTE 6: Async Error =====
console.log('\n🧪 Test 6: Async Error Handling');
console.log('→ Promise rejection caught and handled');

async function riskyOperation() {
  throw new Error('Something went wrong in async operation');
}

riskyOperation().catch(error => {
  handleError(error, { 
    operation: 'risky_async_operation',
    context: 'Async error handling test'
  });
});

// ===== TESTE 7: Custom AppError =====
console.log('\n🧪 Test 7: Custom AppError');
console.log('→ Custom application error');
try {
  throw new AppError(
    'Conviction calculation failed',
    'CALC_ERROR',
    500,
    { matchId: 123, playerId: 456, reason: 'Invalid stats' }
  );
} catch (error) {
  handleError(error, { operation: 'conviction_engine' });
}

// ===== TESTE 8: Error Serialization =====
console.log('\n🧪 Test 8: Error Serialization');
console.log('→ Errors can be converted to JSON');
try {
  throw new APIError('Database connection failed', 503);
} catch (error) {
  const json = error.toJSON();
  console.log(`   └─ JSON: ${JSON.stringify(json, null, 2)}`);
}

// Finalizar
setTimeout(() => {
  console.log('\n\n🎯 Demo finished! All errors were handled centrally.\n');
  console.log('Key takeaway:');
  console.log('✓ Structured error types (no magic strings)');
  console.log('✓ Automatic logging with context');
  console.log('✓ Event emission for subscribers');
  console.log('✓ Status codes for HTTP APIs');
  console.log('✓ Easy to track and debug errors\n');
  process.exit(0);
}, 2000);
