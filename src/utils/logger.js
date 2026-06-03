import fs from 'fs';
import path from 'path';

const LOG_DIR = './logs';
const LOG_FILE = path.join(LOG_DIR, 'app.log');
const LOG_LEVEL_ENV = process.env.LOG_LEVEL || 'info';

/**
 * Log Levels
 * 0 = error
 * 1 = warn
 * 2 = info
 * 3 = debug
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const CURRENT_LOG_LEVEL = LOG_LEVELS[LOG_LEVEL_ENV] || LOG_LEVELS.info;

/**
 * Structured Logger
 * 
 * Emits logs in JSON format for easy parsing by external tools
 * (Datadog, New Relic, Splunk, etc)
 */
class StructuredLogger {
  constructor(logFile = LOG_FILE, logDir = LOG_DIR) {
    this.logFile = logFile;
    this.logDir = logDir;
    this.queue = [];
    this.flushInterval = 5000; // Flush every 5 seconds
    this.isFlushScheduled = false;
    
    // Ensure log directory exists
    this.ensureLogDir();
    
    // Schedule periodic flush
    this.scheduleFlush();
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDir() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (err) {
      console.error('Failed to create log directory:', err.message);
    }
  }

  /**
   * Schedule periodic flush of logs to file
   */
  scheduleFlush() {
    if (!this.isFlushScheduled) {
      setInterval(() => this.flush(), this.flushInterval);
      this.isFlushScheduled = true;
    }
  }

  /**
   * Create log entry object
   */
  createLogEntry(level, message, context = {}) {
    return {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      context,
      pid: process.pid,
      env: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Format log entry as JSON (one per line)
   */
  formatLogEntry(entry) {
    return JSON.stringify(entry);
  }

  /**
   * Write log entry to queue
   */
  writeLog(level, message, context = {}) {
    // Check if should log based on level
    if (LOG_LEVELS[level] > CURRENT_LOG_LEVEL) {
      return;
    }

    const entry = this.createLogEntry(level, message, context);
    this.queue.push(entry);

    // Flush immediately for error level
    if (level === 'error') {
      this.flush();
    }
  }

  /**
   * Flush queued logs to file
   */
  flush() {
    if (this.queue.length === 0) return;

    try {
      const lines = this.queue
        .map(entry => this.formatLogEntry(entry))
        .join('\n');

      fs.appendFileSync(this.logFile, lines + '\n');
      this.queue = [];
    } catch (err) {
      console.error('Failed to flush logs:', err.message);
    }
  }

  /**
   * Log debug message
   * @param {string} message
   * @param {Object} context
   */
  debug(message, context = {}) {
    this.writeLog('debug', message, context);
  }

  /**
   * Log info message
   * @param {string} message
   * @param {Object} context
   */
  info(message, context = {}) {
    this.writeLog('info', message, context);
  }

  /**
   * Log warning message
   * @param {string} message
   * @param {Object} context
   */
  warn(message, context = {}) {
    this.writeLog('warn', message, context);
  }

  /**
   * Log error message
   * @param {string} message
   * @param {Object|Error} context or error
   */
  error(message, contextOrError = {}) {
    let context = contextOrError;

    // If error object is passed, extract stack trace
    if (contextOrError instanceof Error) {
      context = {
        error: contextOrError.message,
        stack: contextOrError.stack,
        name: contextOrError.name
      };
    }

    this.writeLog('error', message, context);
  }

  /**
   * Close logger (flush remaining logs)
   */
  async close() {
    this.flush();
    return Promise.resolve();
  }

  /**
   * Get current log level
   */
  getLogLevel() {
    return LOG_LEVEL_ENV;
  }

  /**
   * Get file path for debugging
   */
  getLogFile() {
    return this.logFile;
  }
}

export const logger = new StructuredLogger();

// Handle graceful shutdown
process.on('exit', async () => {
  await logger.close();
});
