/**
 * @typedef {object} Player
 * @property {number} id
 * @property {string} name 
 * @property {string} short_name
 * @property {string} position 
 * @property {string} jersey
 */

/**
 * @typedef {object} PlayerStats
 * @property {number} match_id
 * @property {string} teams 
 * @property {string} date
 * @property {number} score 
 * @property {number} player_id
 * @property {string} player_team
 * @property {string} player_role 
 * @property {string} short_name
 * @property {string} player_specific_position 
 * @property {number} minutes_played
 * @property {number} rating
 * @property {number} goals
 * @property {number} assists
 * @property {number} xG
 * @property {number} xA
 * @property {number} total_shots
 * @property {number} SOT
 * @property {number} passes
 * @property {number} accuracy
 * @property {number} key_passes
 * @property {number} total_crosses
 * @property {number} accuracy_crosses
 * @property {number} long_balls
 * @property {number} touches
 * @property {number} dribbles
 * @property {number} duels
 * @property {number} recoveries
 * @property {number} cards
 * @property {number} possession
 * @property {null} heatmap  
*/

/**
 * @typedef {Object} Game
 * @property {number} id - ID do evento
 * @property {number} league_id - ID da liga
 * @property {number} season_id - ID da temporada
 * @property {string} event_date - Data do jogo
 * @property {string} status - Status do jogo (scheduled, live, finished)
 * @property {string} period - Período atual
 * @property {number} minute - Minuto atual
 * @property {string} home_team - Time da casa
 * @property {string} away_team - Time visitante
 * @property {number} home_score - Gols time da casa
 * @property {number} away_score - Gols time visitante
 * @property {string|null} venue - Estádio
 * @property {boolean} live_websocket - WebSocket disponível
 */

/**
 * @typedef {Object} Team
 * @property {number} id - ID do time
 * @property {string} name - Nome do time
 * @property {string} formation - Formação atual
 * @property {number} coach_id - ID do técnico
 */

/**
 * @typedef {Object} Lineup
 * @property {string} lineup_status - Status (confirmed, predicted)
 * @property {string} formation - Formação
 * @property {Player[]} starters - Jogadores titulares
 * @property {Player[]} substitutes - Jogadores no banco
 * @property {Array} unavailable - Lesionados e suspensos
 * @property {string} updated_at - Última atualização
 */

/**
 * @typedef {Object} Conviction
 * @property {number} score - Score de 0 a 100
 * @property {string} market - Mercado analisado (shots, corners)
 * @property {number} player_id - ID do jogador
 * @property {string[]} factors - Fatores que compõem o score
 * @property {string} explanation - Explicação textual
 */

/**
 * @typedef {Object} Tip
 * @property {number} conviction_score - Score mínimo pra entrar no tip
 * @property {string} market - Mercado
 * @property {number} player_id - ID do jogador
 * @property {number} game_id - ID do jogo
 * @property {string} reasoning - Justificativa
 */

/**
 * @typedef {Object} Formation
 * @property {string} scheme - Esquema tático ex: 4-3-3
 * @property {string} style - Estilo ofensivo, defensivo, equilibrado
 * @property {number} team_id - ID do time
 */ 