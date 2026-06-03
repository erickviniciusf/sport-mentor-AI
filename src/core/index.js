/**
 * Core module — Exports centralizados
 * 
 * EventBus, constantes de eventos, erros e tratamento de erros
 */

export { eventBus, EventBus } from './EventBus.js';
export { EVENTS } from './events.js';
export {
  AppError,
  ValidationError,
  APIError,
  NotFoundError,
  NetworkError,
  TimeoutError,
  ConfigError,
  AuthorizationError
} from './errors.js';
export {
  handleError,
  handleAsyncError,
  withRetry,
  setupGlobalErrorHandlers,
  createErrorHandler
} from './errorHandler.js';
