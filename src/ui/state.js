let globalTips = [];
let sessionStats = {
    totalMatches: 0,
    confirmedLineups: 0,
    generatedTips: 0
};

export function setGlobalTips(tips) {
    globalTips = tips;
}

export function getGlobalTips() {
    return globalTips;
}

export function incrementMatches(count) {
    sessionStats.totalMatches += count;
}

export function incrementLineups(count) {
    sessionStats.confirmedLineups += count;
}

export function incrementTips(count) {
    sessionStats.generatedTips += count;
}

export function getSessionStats() {
    return sessionStats;
}

export function resetSessionStats() {
    sessionStats = {
        totalMatches: 0,
        confirmedLineups: 0,
        generatedTips: 0
    };
}