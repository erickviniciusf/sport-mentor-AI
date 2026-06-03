/**
 * Definição centralizada de todos os eventos do sistema
 * 
 * Evita magic strings espalhadas no código
 * Facilita descoberta de eventos disponíveis
 * Serve como contrato entre emissores e listeners
 */

export const EVENTS = {
  // Monitor Service events
  MATCH_LIST_UPDATED: 'match:list_updated',
  LINEUP_CONFIRMED: 'lineup:confirmed',
  MONITOR_STARTED: 'monitor:started',
  MONITOR_CYCLE_COMPLETE: 'monitor:cycle_complete',

  // Analysis events
  ANALYSIS_STARTED: 'analysis:started',
  ANALYSIS_COMPLETE: 'analysis:complete',
  PLAYER_ANALYZED: 'player:analyzed',

  // Tips events
  TIP_GENERATED: 'tip:generated',
  TIPS_UPDATED: 'tips:updated',

  // Error events
  ERROR_OCCURRED: 'error:occurred',
  API_ERROR: 'api:error',

  // System events
  SYSTEM_READY: 'system:ready',
  DATA_SYNCED: 'data:synced'
};
