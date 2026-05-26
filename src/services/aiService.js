import Groq from 'groq-sdk';
import { tavily } from '@tavily/core';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const groq = new Groq({ apiKey: config.groq.apiKey });
const tavilyClient = tavily({ apiKey: config.tavily.apiKey });

export async function getMatchContext(homeTeam, awayTeam) {
    try {
        // 1. Busca notícias com Tavily
        const query = `${homeTeam} vs ${awayTeam} escalação notícias hoje 2026`;
        const searchResult = await tavilyClient.search(query, {
            maxResults: 5,
            searchDepth: 'basic',
            includeAnswer: true
        });

        // 2. Monta contexto das notícias
        const newsContext = searchResult.results
            .map(r => `${r.title}: ${r.content?.slice(0, 200)}`)
            .join('\n');

        // 3. Manda pro Groq interpretar
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 500,
            messages: [
                {
                    role: 'system',
                    content: `Você é um analista esportivo brasileiro especializado em futebol, com foco em estatísticas, padrões táticos e comportamento de equipes.
                    Responda sempre em português brasileiro de forma técnica e direta.
                    Estruture sua análise SEMPRE neste formato:

                    MOMENTO DAS EQUIPES: Como cada time está na competição, últimos resultados, pressão.

                    ESTATÍSTICAS: Comportamento do mandante em casa e visitante fora, aproveitamento, gols, clean sheets, head to head.

                    ANÁLISE TÁTICA: Esquema provável, pontos fortes vs fraquezas, jogadores chave.

                    TENDÊNCIA: O que esperar do confronto baseado nos dados, mercados com maior probabilidade.

                    Seja objetivo, técnico e baseado em dados. Máximo 6 parágrafos.`
                 },
                {
                    role: 'user',
                    content: `Com base nestas notícias sobre ${homeTeam} vs ${awayTeam}, 
                    faça um resumo analítico do confronto:\n\n${newsContext}`
                }
            ]
        });

        const analysis = completion.choices[0]?.message?.content || 'Análise não disponível.';

        return {
            query,
            sources: searchResult.results.map(r => r.title),
            analysis
        };

    } catch (error) {
        logger.error('Erro no aiService', error);
        return {
            query: '',
            sources: [],
            analysis: 'Não foi possível carregar a análise de contexto.'
        };
    }
}