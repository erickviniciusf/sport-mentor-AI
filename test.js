// teste.js
import { getEvents } from "./src/providers/bsd/client.js";

async function listarJogosHoje() {
    const fusoBR = 'America/Sao_Paulo';

    function getHojeBR() {
        const agora = new Date();
        return agora.toLocaleDateString('pt-BR', { timeZone: fusoBR })
            .split('/')
            .reverse()
            .join('-');
    }

    function formatHoraBr(dateString) {
        const dt = new Date(dateString);
        return dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: fusoBR });
    }

    const hoje = getHojeBR();
    console.log(`[TEST] Buscando jogos de: ${hoje}`);

    const result = await getEvents(hoje);

    if (!result || !result.results || result.results.length === 0) {
        console.log("[TEST] Nenhum jogo retornado da API para hoje.");
        return;
    }

    console.log(`\nJogos retornados (${result.results.length}):`);
    result.results.forEach(match => {
        const eventDateOrig = match.event_date;
        const eventDateBr = new Date(eventDateOrig).toLocaleDateString('pt-BR', { timeZone: fusoBR });
        const horaBr = formatHoraBr(eventDateOrig);
        console.log(
            `- ${match.home_team} vs ${match.away_team} | STATUS: ${match.status} | `
            + `DATA-API: ${eventDateOrig} | `
            + `DIABR: ${eventDateBr} ${horaBr}`
        );
    });
} 



listarJogosHoje().catch(err => {
    console.error("[TEST] Erro de execução no teste:", err);
});