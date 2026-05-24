import { logger } from "../../utils/logger.js";
import { config } from "../../config/index.js";
const BSD_API_KEY = config.bsd.apiKey 
const BSD_BASE_URL = config.bsd.baseUrl


async function request(endpoint) {
    try {
        const response = await fetch(`${BSD_BASE_URL}${endpoint}`, {
            headers: {
                Authorization: `Token ${BSD_API_KEY}`
            }
        });

            if (!response.ok) {
                throw new Error(`Erro na requisição: ${response.status}`);
        }

            return response.json(); 
        } catch (error) {
            logger.error("Mensagem descritiva do que falho", error);
                throw error; 
                }     
        }

        export async function getEvent(id) {
            return request(`/api/v2/events/${id}`);
        }

        export async function getLineup(eventId) {
            return request(`/api/v2/events/${eventId}/lineups/`)
        }

        export async function getPlayerStats(playerId) {
            return request(`/api/v2/events/${playerId}/player-stats/`)
        }
        export async function getEvents(date) {
            return request(`/api/v2/events/?date_from=${date}&date_to=${date}`);
        }
    
