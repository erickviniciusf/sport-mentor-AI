/**
 * Test — Structured Logging Demo
 * 
 * Demonstra o sistema de logging estruturado
 * Execute: node test-structured-logging.js
 */

import { logger } from './src/utils/logger.js';

console.log('\n🔴 === STRUCTURED LOGGING DEMO ===\n');

// Test 1: Info logs
console.log('🧪 Test 1: Info logging with context');
logger.info('Application started', {
  version: '1.0.1',
  environment: process.env.NODE_ENV || 'development',
  timestamp: Date.now()
});

logger.info('Monitor service initialized', {
  checkInterval: '60s',
  provider: 'BSD',
  maxRetries: 3
});

// Test 2: Debug logs
console.log('🧪 Test 2: Debug logging');
logger.debug('Fetching matches from API', {
  endpoint: '/api/v2/events',
  dateFrom: '2026-06-03',
  dateTo: '2026-06-04',
  limit: 200
});

logger.debug('Match list updated', {
  matchesCount: 15,
  activeMatches: 8,
  processingTime: '245ms'
});

// Test 3: Warning logs
console.log('🧪 Test 3: Warning logging');
logger.warn('Slow API response', {
  endpoint: '/api/v2/events',
  responseTime: '5250ms',
  threshold: '5000ms',
  severity: 'medium'
});

logger.warn('Cache miss detected', {
  key: 'matches:all',
  operation: 'getMatches',
  fallbackToAPI: true
});

// Test 4: Error logs
console.log('🧪 Test 4: Error logging with context');
logger.error('Failed to fetch player stats', {
  playerId: 12345,
  endpoint: '/api/player-stats',
  statusCode: 429,
  reason: 'Rate limit exceeded',
  retryAfter: '60s',
  operation: 'fetchPlayerStats'
});

logger.error('Network connection timeout', {
  endpoint: 'sports.bzzoiro.com',
  timeout: '15000ms',
  attempt: 2,
  maxRetries: 3,
  operation: 'apiRequest'
});

// Test 5: Complex operations
console.log('🧪 Test 5: Logging complex operations');
const startTime = Date.now();

setTimeout(() => {
  const duration = Date.now() - startTime;
  logger.info('Match analysis completed', {
    matchId: 123,
    playersAnalyzed: 22,
    tipsGenerated: 5,
    duration,
    averageConviction: 72.4,
    operation: 'analyzeMatch'
  });
}, 100);

// Test 6: Error objects
console.log('🧪 Test 6: Logging Error objects');
try {
  throw new Error('Database connection failed');
} catch (error) {
  logger.error('Database error caught', error);
}

// Flush logs after tests
setTimeout(async () => {
  await logger.close();

  console.log('\n✅ All tests completed!\n');
  console.log('📁 Logs written to: ./logs/app.log\n');
  console.log('📊 Analyze logs with:');
  console.log('   node src/utils/logAnalyzer.js summary');
  console.log('   node src/utils/logAnalyzer.js recent 20');
  console.log('   node src/utils/logAnalyzer.js errors\n');
}, 200);
