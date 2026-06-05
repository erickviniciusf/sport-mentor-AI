
    function mapPlayer(rawPlayer) {
        if (!rawPlayer) return null;
        return {
            id: rawPlayer.id || null,
            name: rawPlayer.name || '',
            short_name: rawPlayer.short_name || '',
            position: rawPlayer.position || '',
            jersey: rawPlayer.jersey || ''
        }
    }

    function mapPlayerStats(rawPlayerStats) {
        return {
            match_id: rawPlayerStats.match_id,
            teams: rawPlayerStats.teams,
            date: rawPlayerStats.date,
            score: rawPlayerStats.score,
            player_id: rawPlayerStats.player_id,
            player_team: rawPlayerStats.player_team,
            player_role: rawPlayerStats.player_role,
            short_name: rawPlayerStats.short_name,
            player_specific_position: rawPlayerStats.specific_position,
            rating: rawPlayerStats.rating,
            goals: rawPlayerStats.goals,
            assists: rawPlayerStats.assists,
            xG: rawPlayerStats.xG,
            xA: rawPlayerStats.xA,
            total_shots: rawPlayerStats.total_shots,
            SOT: rawPlayerStats.SOT,
            passes: rawPlayerStats.passes,
            accuracy: rawPlayerStats.accuracy,
            key_passes: rawPlayerStats.key_passes,
            total_crosses: rawPlayerStats.total_crosses,
            accuracy_crosses: rawPlayerStats.accuracy_crosses,
            long_balls: rawPlayerStats.long_balls,
            touches: rawPlayerStats.touches,
            dribbles: rawPlayerStats.dribbles,
            duels: rawPlayerStats.duels,
            recoveries: rawPlayerStats.recoveries,
            cards: rawPlayerStats.cards,
            possession: rawPlayerStats.possession,
            heatmap: rawPlayerStats.heatmap
        }
    }

    function mapGame(rawGame) {
        return {
            id: rawGame.id,
            league_id: rawGame.league_id,
            season_id: rawGame.season_id,
            event_date: rawGame.event_date,
            status: rawGame.status,
            period: rawGame.period,
            minute: rawGame.minute,
            home_team: rawGame.home_team,
            away_team: rawGame.away_team,
            home_score: rawGame.home_score,
            away_score: rawGame.away_score,
            venue: rawGame.venue,
            live_websocket: rawGame.live_websocket,
            weather: rawGame.weather
        }
    }

    function mapTeam(rawTeam) {
        return {
            id: rawTeam.id,
            name: rawTeam.name, 
            formation: rawTeam.formation,
            coach_id: rawTeam.coach_id
        }
    }

    function mapLineup(rawLineup) {
        if (!rawLineup) return null;
        const lineups = rawLineup.lineups || {};
        const home = lineups.home || {};
        const away = lineups.away || {};
        return {
            lineup_status: rawLineup.lineup_status || 'unknown',
            updated_at: rawLineup.updated_at || '',
            home: {
                team_id: home.team_id || null,
                team_name: home.team_name || '',
                formation: home.formation || '',
                starters: Array.isArray(home.players) ? home.players.map(mapPlayer).filter(Boolean) : [],
                substitutes: Array.isArray(home.substitutes) ? home.substitutes.map(mapPlayer).filter(Boolean) : [],
            },
            away: {
                team_id: away.team_id || null,
                team_name: away.team_name || '',
                formation: away.formation || '',
                starters: Array.isArray(away.players) ? away.players.map(mapPlayer).filter(Boolean) : [],
                substitutes: Array.isArray(away.substitutes) ? away.substitutes.map(mapPlayer).filter(Boolean) : [],
            }
        }
    }


    export const mapper  = { mapPlayer, mapPlayerStats, mapGame, mapTeam, mapLineup };