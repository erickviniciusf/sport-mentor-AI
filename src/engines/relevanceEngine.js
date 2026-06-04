/**
 * relevanceEngine.js
 * ------------------------------------------------------------------
 * Calcula um "score de relevância" para uma partida.
 *
 * A relevância combina dados REAIS da BSD API com uma base de conhecimento
 * local (usada como complemento/fallback):
 *   - peso da liga        (tabela de prestígio por league_id — local)
 *   - clássicos/derbies   (campo `is_local_derby` da API; fallback: lista local)
 *   - times grandes       (lista de clubes de peso — local)
 *   - fase/decisão        (campo `round_name` da API: final, semi, quartas...)
 *
 * Descoberta importante: o evento da API TRAZ `is_local_derby`, `round_name`,
 * `round_number` e `group_name` — por isso o clássico e a fase vêm do dado real
 * quando disponível, caindo na heurística local só quando o campo está vazio.
 *
 * O score serve para ORDENAR as partidas (maior = mais relevante) e
 * para gerar um selo visual (badge) na tela TOP PARTIDAS.
 */

// ============================================
// PESO DA LIGA (prestígio por league_id)
// IDs alinhados com TOP_LEAGUES em topPartidas.js
// ============================================
const LEAGUE_WEIGHTS = {
    27: 50, // World Cup 2026
    7:  45, // Champions League
    32: 42, // Copa Libertadores
    8:  35, // Europa League
    33: 32, // Copa Sudamericana
    35: 30, // Copa do Brasil
    3:  30, // La Liga
    1:  30, // Premier League
    9:  28, // Brasileirão A
    4:  28, // Serie A
    5:  28, // Bundesliga
    6:  26, // Ligue 1
    2:  22, // Liga Portugal
    10: 20, // Eredivisie
    17: 18, // Saudi Pro League
    13: 16, // Scottish Prem.
    14: 16, // Pro League
    19: 16, // Liga MX
    20: 16, // Liga MX

    // Seleções — eliminatórias e Nations League (jogos oficiais)
    58: 30, // Elim. Copa UEFA
    59: 30, // Elim. Copa CONMEBOL
    60: 26, // Elim. Copa CAF
    61: 26, // Elim. Copa AFC
    62: 26, // Elim. Copa CONCACAF
    63: 22, // Elim. Copa OFC
    64: 30, // UEFA Nations League
    65: 24, // CONCACAF Nations League

    // Copas nacionais (mata-mata de clubes)
    39: 22, // FA Cup
    40: 18, // Carabao Cup
    41: 22, // Copa del Rey
    42: 22, // Coppa Italia
    43: 22, // DFB Pokal
    44: 20, // Coupe de France

    // Amistosos de seleção (relevância baixa por padrão)
    31: 14, // International Friendly Games
};

// Peso padrão para qualquer liga não listada acima
const DEFAULT_LEAGUE_WEIGHT = 12;

// ============================================
// TIMES GRANDES (tokens normalizados, sem acento, minúsculo)
// ============================================
const BIG_CLUBS = [
    // Brasil
    'flamengo', 'palmeiras', 'corinthians', 'sao paulo', 'fluminense',
    'vasco', 'botafogo', 'gremio', 'internacional', 'cruzeiro',
    'atletico mineiro', 'santos',
    // Espanha
    'real madrid', 'barcelona', 'atletico madrid',
    // Inglaterra
    'manchester city', 'manchester united', 'liverpool', 'chelsea',
    'arsenal', 'tottenham',
    // Itália
    'juventus', 'milan', 'inter', 'napoli', 'roma',
    // Alemanha
    'bayern', 'borussia dortmund',
    // França
    'psg', 'paris', 'marseille',
    // Portugal
    'benfica', 'porto', 'sporting',
];

// ============================================
// CLÁSSICOS / DERBIES (pares de tokens de time)
// A ordem dentro de `teams` não importa (casa/visitante).
// ============================================
const RIVALRIES = [
    // Brasil
    { name: 'Fla-Flu',              teams: ['flamengo', 'fluminense'] },
    { name: 'Derby Paulista',       teams: ['corinthians', 'palmeiras'] },
    { name: 'Majestoso',            teams: ['corinthians', 'sao paulo'] },
    { name: 'San-São',              teams: ['santos', 'sao paulo'] },
    { name: 'Choque-Rei',           teams: ['palmeiras', 'sao paulo'] },
    { name: 'Derby Carioca',        teams: ['flamengo', 'vasco'] },
    { name: 'Clássico Vovô',        teams: ['botafogo', 'fluminense'] },
    { name: 'Gre-Nal',              teams: ['gremio', 'internacional'] },
    // Espanha
    { name: 'El Clásico',           teams: ['real madrid', 'barcelona'] },
    { name: 'Derby de Madrid',      teams: ['real madrid', 'atletico madrid'] },
    // Itália
    { name: 'Derby della Madonnina', teams: ['milan', 'inter'] },
    { name: 'Derby della Capitale', teams: ['roma', 'lazio'] },
    { name: 'Derby d\'Italia',      teams: ['juventus', 'inter'] },
    // Inglaterra
    { name: 'Manchester Derby',     teams: ['manchester city', 'manchester united'] },
    { name: 'North West Derby',     teams: ['liverpool', 'manchester united'] },
    { name: 'North London Derby',   teams: ['arsenal', 'tottenham'] },
    // Alemanha
    { name: 'Der Klassiker',        teams: ['bayern', 'borussia dortmund'] },
    // Portugal
    { name: 'O Clássico',           teams: ['benfica', 'porto'] },
    { name: 'Derby de Lisboa',      teams: ['benfica', 'sporting'] },
];

// ============================================
// PESOS DOS BÔNUS
// ============================================
const BONUS = {
    CLASSIC:        40, // clássico/derby (is_local_derby ou lista local)
    TWO_BIG_CLUBS:  25, // os dois times são grandes
    ONE_BIG_CLUB:   12, // apenas um dos times é grande
};

// Bônus por fase da competição, lido de `round_name`.
// `decisive` controla o selo 🏆 e indica mata-mata.
const ROUND_RULES = [
    { test: /\bfinal\b/,                  guard: /semi|quarter/, bonus: 30, label: 'FINAL',     decisive: true },
    { test: /semi/,                       bonus: 22, label: 'SEMIFINAL', decisive: true },
    { test: /quarter|quartas/,            bonus: 16, label: 'QUARTAS',   decisive: true },
    { test: /round of 16|last 16|oitavas/, bonus: 10, label: 'OITAVAS',  decisive: true },
    { test: /play.?off|knockout|mata/,    bonus: 8,  label: 'MATA-MATA', decisive: true },
];

// Limiar para receber o selo "DESTAQUE" (clássicos sempre recebem selo)
const DESTAQUE_THRESHOLD = 50;

// ============================================
// HELPERS
// ============================================

/** Normaliza um nome de time: minúsculo, sem acento, sem espaços nas bordas. */
function normalize(str) {
    return (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

/**
 * Verifica se um token de time aparece como palavra inteira no nome.
 * Usa fronteira de palavra (\b) para evitar falsos positivos
 * (ex.: 'inter' NÃO casa com 'internacional').
 */
function matchesTeam(normalizedName, token) {
    return new RegExp(`\\b${token}\\b`).test(normalizedName);
}

/** Retorna true se o nome normalizado corresponder a algum clube grande. */
function isBigClub(normalizedName) {
    return BIG_CLUBS.some(token => matchesTeam(normalizedName, token));
}

/** Retorna a rivalidade encontrada entre os dois times, ou null. */
function findRivalry(homeNorm, awayNorm) {
    for (const rivalry of RIVALRIES) {
        const [a, b] = rivalry.teams;
        const direct  = matchesTeam(homeNorm, a) && matchesTeam(awayNorm, b);
        const reverse = matchesTeam(homeNorm, b) && matchesTeam(awayNorm, a);
        if (direct || reverse) return rivalry;
    }
    return null;
}

/**
 * Interpreta a fase da competição a partir de `round_name`/`group_name`.
 * @returns {{ bonus: number, label: string|null, decisive: boolean }}
 */
function parseRound(match) {
    const raw = normalize(match.round_name || match.group_name || '');
    if (!raw) return { bonus: 0, label: null, decisive: false };
    for (const rule of ROUND_RULES) {
        if (rule.test.test(raw) && !(rule.guard && rule.guard.test(raw))) {
            return { bonus: rule.bonus, label: rule.label, decisive: rule.decisive };
        }
    }
    return { bonus: 0, label: null, decisive: false };
}

// ============================================
// API PÚBLICA
// ============================================

/**
 * Calcula a relevância de uma partida.
 * @param {object} match - Evento da BSD API (campos: league_id, home_team, away_team, ...)
 * @returns {{ score: number, factors: string[], isClassic: boolean, rivalryName: string|null }}
 */
export function scoreMatch(match) {
    const home = normalize(match.home_team);
    const away = normalize(match.away_team);
    const factors = [];
    let score = 0;

    // 1) Peso da liga
    const leagueWeight = LEAGUE_WEIGHTS[match.league_id] ?? DEFAULT_LEAGUE_WEIGHT;
    score += leagueWeight;

    // 2) Times grandes
    const homeBig = isBigClub(home);
    const awayBig = isBigClub(away);
    if (homeBig && awayBig) {
        score += BONUS.TWO_BIG_CLUBS;
        factors.push('Dois times grandes');
    } else if (homeBig || awayBig) {
        score += BONUS.ONE_BIG_CLUB;
        factors.push('Time grande envolvido');
    }

    // 3) Clássico / derby — prioriza a flag REAL da API; cai na lista local se vazia
    let isClassic = match.is_local_derby === true;
    let rivalryName = null;
    if (isClassic) {
        factors.push('Clássico (API)');
    } else {
        const rivalry = findRivalry(home, away);
        if (rivalry) {
            isClassic = true;
            rivalryName = rivalry.name;
            factors.push(`Clássico: ${rivalry.name}`);
        }
    }
    if (isClassic) score += BONUS.CLASSIC;

    // 4) Fase/decisão — lida de round_name/group_name (dado real da API)
    const round = parseRound(match);
    if (round.bonus > 0) {
        score += round.bonus;
        factors.push(`Fase: ${round.label}`);
    }

    return {
        score,
        factors,
        isClassic,
        rivalryName,
        roundLabel: round.label,
        isDecisive: round.decisive,
    };
}

/**
 * Gera o selo visual (badge) com tags do blessed a partir do score.
 * @param {{ score: number, isClassic: boolean, rivalryName: string|null, roundLabel: string|null, isDecisive: boolean }} scored
 * @returns {string} String com tags do blessed, ou '' se não houver destaque.
 */
export function getBadge(scored) {
    if (scored.isClassic) {
        const nome = scored.rivalryName ? scored.rivalryName.toUpperCase() : 'CLÁSSICO';
        return `{red-fg}{bold}🔥 ${nome}{/bold}{/red-fg}`;
    }
    if (scored.isDecisive) {
        return `{magenta-fg}{bold}🏆 ${scored.roundLabel}{/bold}{/magenta-fg}`;
    }
    if (scored.score >= DESTAQUE_THRESHOLD) {
        return '{yellow-fg}{bold}⭐ DESTAQUE{/bold}{/yellow-fg}';
    }
    return '';
}

/**
 * Ordena as partidas da mais relevante para a menos.
 * Anexa o resultado de scoreMatch em `_relevance` de cada partida (sem mutar a original).
 * Empate é desempatado pela data do evento (mais cedo primeiro).
 * @param {object[]} matches
 * @returns {Array<object & { _relevance: ReturnType<typeof scoreMatch> }>}
 */
export function sortByRelevance(matches) {
    return matches
        .map(match => ({ ...match, _relevance: scoreMatch(match) }))
        .sort((a, b) => {
            if (b._relevance.score !== a._relevance.score) {
                return b._relevance.score - a._relevance.score;
            }
            return new Date(a.event_date) - new Date(b.event_date);
        });
}
