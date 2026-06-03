import EventEmitter from 'events';
import { logger } from '../utils/logger.js';

/**
 * EventBus — Singleton para comunicação desacoplada entre módulos
 * 
 * Permite que serviços (Monitor, Análise) emitam eventos
 * e que UI/componentes escutem mudanças sem acoplamento direto
 */
export class EventBus extends EventEmitter {
  static instance = null;

  constructor() {
    super();
    this.setMaxListeners(100); // Evitar warnings com muitos listeners
  }

  /**
   * Obtém instância única do EventBus
   * @returns {EventBus}
   */
  static getInstance() {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
      logger.info('EventBus initialized (singleton)');
    }
    return EventBus.instance;
  }

  /**
   * Emite evento com logging automático
   * @param {string} event - Nome do evento (ex: 'match:updated')
   * @param {Object} data - Dados do evento
   */
  emit(event, data = {}) {
    const listenerCount = this.listenerCount(event);
    logger.info(`Event emitted: ${event} [${listenerCount} listeners]`);
    
    return super.emit(event, data);
  }

  /**
   * Remove todos os listeners (útil em testes)
   */
  reset() {
    this.removeAllListeners();
    logger.info('EventBus reset: all listeners removed');
  }
}

// Exportar instância única
export const eventBus = EventBus.getInstance();
