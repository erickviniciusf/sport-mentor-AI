import { logger } from "../utils/logger.js";   


export async function buildTips(convictions) {
    try {
        const tips = convictions.filter(conviction => conviction.score >= 70);
        logger.info(`Tips gerados: ${tips.length} de ${convictions.length} convictions`);
        return tips; 
        } catch (error) {
    logger.error(`Erro ao calcular conviction`, error);
    
    } 
  }
