/**
 * Custom Error Classes
 * 
 * Hierarquia de erros estruturada para tratamento consistente
 */

/**
 * Erro base da aplicação
 */
export class AppError extends Error {
  constructor(message, code = 'INTERNAL_ERROR', statusCode = 500, context = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp
    };
  }
}

/**
 * Erro de validação de dados
 */
export class ValidationError extends AppError {
  constructor(message, context = {}) {
    super(message, 'VALIDATION_ERROR', 400, context);
    this.name = 'ValidationError';
  }
}

/**
 * Erro de API/requisição HTTP
 */
export class APIError extends AppError {
  constructor(message, statusCode = 500, context = {}) {
    super(message, 'API_ERROR', statusCode, context);
    this.name = 'APIError';
  }
}

/**
 * Erro quando recurso não é encontrado
 */
export class NotFoundError extends AppError {
  constructor(resource, identifier) {
    super(
      `${resource} not found: ${identifier}`,
      'NOT_FOUND',
      404,
      { resource, identifier }
    );
    this.name = 'NotFoundError';
  }
}

/**
 * Erro de conexão/rede
 */
export class NetworkError extends AppError {
  constructor(message, context = {}) {
    super(message, 'NETWORK_ERROR', 503, context);
    this.name = 'NetworkError';
  }
}

/**
 * Erro de timeout
 */
export class TimeoutError extends AppError {
  constructor(operation, timeout, context = {}) {
    super(
      `Operation '${operation}' timed out after ${timeout}ms`,
      'TIMEOUT_ERROR',
      504,
      { operation, timeout, ...context }
    );
    this.name = 'TimeoutError';
  }
}

/**
 * Erro de configuração
 */
export class ConfigError extends AppError {
  constructor(message, context = {}) {
    super(message, 'CONFIG_ERROR', 500, context);
    this.name = 'ConfigError';
  }
}

/**
 * Erro de permissão/autorização
 */
export class AuthorizationError extends AppError {
  constructor(message, context = {}) {
    super(message, 'AUTHORIZATION_ERROR', 403, context);
    this.name = 'AuthorizationError';
  }
}
