import { logger } from "../../utils/logger.js";
import { config } from "../../config/index.js";
import { APIError, NetworkError, TimeoutError, handleError } from "../../core/index.js";

const BSD_API_KEY = config.bsd.apiKey 
const BSD_BASE_URL = config.bsd.baseUrl

const REQUEST_TIMEOUT = 15000; // 15 segundos

async function request(endpoint) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        const response = await fetch(`${BSD_BASE_URL}${endpoint}`, {
            headers: {
                Authorization: `Token ${BSD_API_KEY}`
            },
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            throw new APIError(
                `BSD API returned ${response.status}`,
                response.status,
                { endpoint, statusCode: response.status }
            );
        }

        return response.json(); 
    } catch (error) {
        // Erro de timeout
        if (error.name === 'AbortError') {
            const timeoutError = new TimeoutError(
                `Request to ${endpoint}`,
                REQUEST_TIMEOUT,
                { endpoint }
            );
            handleError(timeoutError, { endpoint });
            throw timeoutError;
        }

        // Erro de conexão/rede
        if (error instanceof TypeError && error.message.includes('fetch')) {
            const networkError = new NetworkError(
                `Failed to connect to BSD API at ${BSD_BASE_URL}`,
                { endpoint, originalError: error.message }
            );
            handleError(networkError, { endpoint });
            throw networkError;
        }

        // Erro genérico
        if (error instanceof APIError) {
            handleError(error, { endpoint });
            throw error;
        }

        const genericError = new APIError(
            `Request to ${endpoint} failed: ${error.message}`,
            500,
            { endpoint, originalError: error.message }
        );
        handleError(genericError, { endpoint });
        throw genericError;
    }     
}

// ============================================
// EVENTOS
// ============================================
export async function getEvent(id) {
    return request(`/api/v2/events/${id}`);
}

export async function getEvents(dateFrom, dateTo) {
    return request(`/api/v2/events/?date_from=${dateFrom}&date_to=${dateTo}&limit=200`);
}

// ============================================
// LINEUPS
// ============================================
export async function getLineup(eventId) {
    return request(`/api/v2/events/${eventId}/lineups/`)
}

// ============================================
// PLAYER STATS (CORRIGIDO PARA V2 + L10)
// ============================================
/**
 * Busca stats do jogador nos últimos N jogos (padrão: 10)
 * @param {number} playerId - ID do jogador
 * @param {number} limit - Número de jogos (default: 10 para L10)
 * @returns {Promise<Object>} Stats do jogador em ordem descente (mais recente primeiro)
 */
export async function getPlayerStats(playerId, limit = 10) {
    return request(`/api/player-stats/?player=${playerId}&limit=${limit}`);
}

// ============================================
// PLAYER STATS POR EVENTO (para stats específicos do jogo)
// ============================================
/**
 * Busca stats de UM jogador em UM jogo específico
 * @param {number} eventId - ID do evento/jogo
 * @returns {Promise<Object>} Array com stats de todos os 22+ jogadores
 */
export async function getEventPlayerStats(eventId) {
    return request(`/api/v2/events/${eventId}/player-stats/`);
}

// ============================================
// STATS DO TIME (para H2H e séries)
// ============================================
/**
 * Busca todos os jogos de um time em uma data range
 * Usado para: L10 jogos individuais, H2H confrontos diretos
 * @param {number} teamId - ID do time
 * @param {string} dateFrom - YYYY-MM-DD
 * @param {string} dateTo - YYYY-MM-DD
 * @param {number} limit - Limite de resultados (default: 10)
 * @returns {Promise<Object>} Array de eventos
 */
export async function getTeamFixtures(teamId, dateFrom, dateTo, limit = 10) {
    return request(`/api/v2/teams/${teamId}/fixtures/?date_from=${dateFrom}&date_to=${dateTo}&limit=${limit}`);
}

// ============================================
// H2H (Head-to-Head) — Últimos confrontos diretos
// ============================================
/**
 * Busca últimos confrontos diretos entre dois times
 * @param {number} homeTeamId - ID do time da casa
 * @param {number} awayTeamId - ID do time visitante
 * @param {number} limit - Últimos N confrontos (default: 10)
 * @returns {Promise<Object>} Array de eventos dos confrontos
 */
export async function getHeadToHeadMatches(homeTeamId, awayTeamId, limit = 10) {
    // Nota: BSD não tem endpoint direto de H2H, então filtramos manualmente
    // Busca últimos 20 jogos de cada time e filtra os confrontos diretos
    try {
        const homeFixtures = await request(`/api/v2/teams/${homeTeamId}/fixtures/?limit=20`);
        const awayFixtures = await request(`/api/v2/teams/${awayTeamId}/fixtures/?limit=20`);

        // Combina e filtra confrontos diretos
        const h2hMatches = homeFixtures.results.filter(match => 
            (match.home_team_id === homeTeamId && match.away_team_id === awayTeamId) ||
            (match.home_team_id === awayTeamId && match.away_team_id === homeTeamId)
        ).slice(0, limit);

        return { count: h2hMatches.length, results: h2hMatches };
    } catch (error) {
        handleError(error, { 
            operation: 'getHeadToHeadMatches',
            homeTeamId, 
            awayTeamId 
        });
        throw error;
    }
}