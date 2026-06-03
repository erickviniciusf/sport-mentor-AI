/**
 * Error Handler — Centralizado
 * 
 * Gerencia todos os erros da aplicação:
 * - Logging estruturado
 * - Emissão de eventos
 * - Retry automático
 * - Notificação de usuário
 */

import { logger } from '../utils/logger.js';
import { eventBus, EVENTS } from './index.js';
import { AppError } from './errors.js';

/**
 * Configuração de retry automático por tipo de erro
 */
const RETRY_CONFIG = {
  NETWORK_ERROR: { maxRetries: 3, delayMs: 1000 },
  TIMEOUT_ERROR: { maxRetries: 2, delayMs: 2000 },
  API_ERROR: { maxRetries: 3, delayMs: 1500 },
  DEFAULT: { maxRetries: 0, delayMs: 0 }
};

/**
 * Handler principal de erros
 */
export function handleError(error, context = {}) {
  // Converter erros genéricos para AppError
  const appError = error instanceof AppError 
    ? error 
    : new AppError(error.message || 'Unknown error', 'UNKNOWN_ERROR', 500, context);

  // Log estruturado
  logger.error(
    `[${appError.code}] ${appError.message}`,
    {
      ...appError.context,
      ...context,
      timestamp: appError.timestamp,
      stack: error.stack
    }
  );

  // Emitir evento de erro
  eventBus.emit(EVENTS.ERROR_OCCURRED, {
    error: appError,
    context,
    timestamp: appError.timestamp
  });

  return appError;
}

/**
 * Wrapper para funções assincronas com tratamento automático de erros
 * 
 * Uso:
 * const result = await handleAsyncError(
 *   async () => await riskyOperation(),
 *   'Failed to do something',
 *   { operation: 'risky_operation' }
 * );
 */
export async function handleAsyncError(
  fn,
  errorMessage = 'Operation failed',
  context = {}
) {
  try {
    return await fn();
  } catch (error) {
    const appError = handleError(error, { operation: errorMessage, ...context });
    throw appError;
  }
}

/**
 * Wrapper com retry automático
 * 
 * Uso:
 * const result = await withRetry(
 *   () => fetchData(),
 *   'NETWORK_ERROR'  // ou qualquer código de erro
 * );
 */
export async function withRetry(fn, errorCode = 'NETWORK_ERROR') {
  const config = RETRY_CONFIG[errorCode] || RETRY_CONFIG.DEFAULT;
  let lastError;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      logger.info(`Attempt ${attempt}/${config.maxRetries + 1}`);
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < config.maxRetries + 1) {
        logger.warn(`Attempt ${attempt} failed, retrying in ${config.delayMs}ms`, {
          error: error.message,
          attempt,
          maxRetries: config.maxRetries + 1
        });

        await new Promise(resolve => setTimeout(resolve, config.delayMs));
      }
    }
  }

  throw lastError;
}

/**
 * Setup de error handlers globais
 * Execute uma vez na inicialização da app
 */
export function setupGlobalErrorHandlers() {
  // Unhandled Promise Rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined
    });

    eventBus.emit(EVENTS.ERROR_OCCURRED, {
      type: 'unhandledRejection',
      reason,
      fatal: true,
      timestamp: Date.now()
    });
  });

  // Uncaught Exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception (FATAL)', {
      message: error.message,
      stack: error.stack
    });

    eventBus.emit(EVENTS.ERROR_OCCURRED, {
      type: 'uncaughtException',
      error: error.message,
      fatal: true,
      timestamp: Date.now()
    });

    // Sair do processo para evitar estado inconsistente
    process.exit(1);
  });

  logger.info('Global error handlers initialized');
}

/**
 * Criar um wrapper funcional para métodos de classe
 * 
 * Uso:
 * class MyService {
 *   async myMethod() { ... }
 * }
 * 
 * MyService.prototype.myMethod = createErrorHandler(
 *   MyService.prototype.myMethod
 * );
 */
export function createErrorHandler(fn) {
  return async function (...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      handleError(error, {
        method: fn.name,
        args: args.map(a => typeof a === 'object' ? '[Object]' : a)
      });
      throw error;
    }
  };
}
