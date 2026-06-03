/**
 * Log Analysis Utilities
 * 
 * Parse and analyze structured logs from app.log
 * Usage: node src/utils/logAnalyzer.js <command> [options]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, '../../logs/app.log');

/**
 * Parse a single JSON log line
 */
function parseLogLine(line) {
  try {
    return JSON.parse(line);
  } catch (err) {
    return null;
  }
}

/**
 * Read all logs from file
 */
function readAllLogs() {
  try {
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(parseLogLine)
      .filter(log => log !== null);
  } catch (err) {
    console.error('Error reading log file:', err.message);
    return [];
  }
}

/**
 * Filter logs by level
 */
function filterByLevel(logs, level) {
  return logs.filter(log => log.level === level.toUpperCase());
}

/**
 * Filter logs by time range
 */
function filterByTimeRange(logs, startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  return logs.filter(log => {
    const logTime = new Date(log.timestamp);
    return logTime >= start && logTime <= end;
  });
}

/**
 * Filter logs by message pattern
 */
function filterByPattern(logs, pattern) {
  const regex = new RegExp(pattern, 'i');
  return logs.filter(log => regex.test(log.message));
}

/**
 * Count errors per type
 */
function countErrorsByType(logs) {
  const errors = filterByLevel(logs, 'error');
  const counts = {};

  errors.forEach(error => {
    const type = error.context?.error || 'UNKNOWN';
    counts[type] = (counts[type] || 0) + 1;
  });

  return counts;
}

/**
 * Get error statistics
 */
function getErrorStats(logs) {
  const errors = filterByLevel(logs, 'error');
  const warnings = filterByLevel(logs, 'warn');

  return {
    totalErrors: errors.length,
    totalWarnings: warnings.length,
    errorsByType: countErrorsByType(logs),
    recentErrors: errors.slice(-5).reverse()
  };
}

/**
 * Get performance metrics
 */
function getPerformanceMetrics(logs) {
  const metrics = {};

  logs.forEach(log => {
    if (log.context?.duration) {
      const operation = log.context.operation || 'unknown';
      if (!metrics[operation]) {
        metrics[operation] = { count: 0, totalDuration: 0, maxDuration: 0 };
      }
      metrics[operation].count++;
      metrics[operation].totalDuration += log.context.duration;
      metrics[operation].maxDuration = Math.max(
        metrics[operation].maxDuration,
        log.context.duration
      );
    }
  });

  // Calculate averages
  Object.keys(metrics).forEach(op => {
    metrics[op].avgDuration = metrics[op].totalDuration / metrics[op].count;
  });

  return metrics;
}

/**
 * Display summary
 */
function displaySummary() {
  const logs = readAllLogs();
  const stats = getErrorStats(logs);

  console.log('\n📊 LOG SUMMARY\n');
  console.log(`Total logs: ${logs.length}`);
  console.log(`Errors: ${stats.totalErrors}`);
  console.log(`Warnings: ${stats.totalWarnings}`);
  console.log(`Info: ${filterByLevel(logs, 'info').length}`);
  console.log(`Debug: ${filterByLevel(logs, 'debug').length}`);

  if (Object.keys(stats.errorsByType).length > 0) {
    console.log('\n🔴 Errors by type:');
    Object.entries(stats.errorsByType).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });
  }

  if (stats.recentErrors.length > 0) {
    console.log('\n⚠️  Recent errors:');
    stats.recentErrors.forEach(error => {
      console.log(`  - ${new Date(error.timestamp).toLocaleTimeString()}: ${error.message}`);
    });
  }

  console.log('\n');
}

/**
 * Display errors
 */
function displayErrors(pattern = null) {
  let logs = readAllLogs();
  logs = filterByLevel(logs, 'error');

  if (pattern) {
    logs = filterByPattern(logs, pattern);
  }

  console.log(`\n🔴 ERRORS (${logs.length} total)\n`);

  logs.slice(-20).forEach(error => {
    console.log(`${new Date(error.timestamp).toISOString()} - ${error.message}`);
    if (error.context?.stack) {
      console.log(error.context.stack);
    } else if (error.context) {
      console.log(JSON.stringify(error.context, null, 2));
    }
    console.log('---');
  });
}

/**
 * Display recent logs
 */
function displayRecent(count = 10) {
  const logs = readAllLogs();
  console.log(`\n📋 RECENT ${count} LOGS\n`);

  logs.slice(-count).forEach(log => {
    const icon = {
      DEBUG: '🔍',
      INFO: 'ℹ️',
      WARN: '⚠️',
      ERROR: '🔴'
    }[log.level] || '📝';

    console.log(
      `${icon} [${log.level}] ${new Date(log.timestamp).toLocaleTimeString()} - ${log.message}`
    );

    if (Object.keys(log.context).length > 0) {
      console.log(`   Context: ${JSON.stringify(log.context)}`);
    }
  });

  console.log();
}

// CLI Interface
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'summary':
    displaySummary();
    break;
  case 'errors':
    displayErrors(arg);
    break;
  case 'recent':
    displayRecent(arg ? parseInt(arg) : 10);
    break;
  case 'stats':
    const logs = readAllLogs();
    console.log('\n📊 PERFORMANCE METRICS\n');
    console.log(JSON.stringify(getPerformanceMetrics(logs), null, 2));
    break;
  default:
    console.log(`
Usage: node src/utils/logAnalyzer.js <command> [options]

Commands:
  summary           Show log summary and error stats
  errors [pattern]  Show errors (optionally filtered by pattern)
  recent [count]    Show recent N logs (default: 10)
  stats             Show performance metrics

Examples:
  node src/utils/logAnalyzer.js summary
  node src/utils/logAnalyzer.js errors API_ERROR
  node src/utils/logAnalyzer.js recent 20
  node src/utils/logAnalyzer.js stats
`);
}
