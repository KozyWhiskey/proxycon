import { isCommanderFormat, isTeamFormat, type StatGame } from './weekend';
export type StatsFormat = 'commander' | 'tournament' | 'team' | 'other';
export function inStatsFormat(g: StatGame, f: string) { return f === 'tournament' ? g.tournament : g.tournament ? false : f === 'commander' ? isCommanderFormat(g.gameType) : f === 'team' ? isTeamFormat(g.gameType) : !isCommanderFormat(g.gameType) && !isTeamFormat(g.gameType); }
export function encounterStats(games: StatGame[]) { const out = new Map<string, {
    a: string;
    b: string;
    commander: {
        a: number;
        b: number;
        shared: number;
        draws: number;
        neither: number;
    };
    tournament: {
        a: number;
        b: number;
        shared: number;
        draws: number;
        neither: number;
    };
}>(); const matches = new Map<string, StatGame[]>(); for (const g of games)
    matches.set(g.matchId, [...(matches.get(g.matchId) || []), g]); for (const group of matches.values()) {
    if (group.length < 2)
        continue;
    const t = group[0].tournament;
    if (!t && !isCommanderFormat(group[0].gameType))
        continue;
    for (let i = 0; i < group.length; i++)
        for (let j = i + 1; j < group.length; j++) {
            const pair = [group[i], group[j]].sort((a, b) => a.profileId.localeCompare(b.profileId));
            const key = pair.map(g => g.profileId).join('|');
            const row = out.get(key) || { a: pair[0].profileId, b: pair[1].profileId, commander: { a: 0, b: 0, shared: 0, draws: 0, neither: 0 }, tournament: { a: 0, b: 0, shared: 0, draws: 0, neither: 0 } };
            const col = t ? row.tournament : row.commander;
            col.shared++;
            if (pair[0].result === 'win' && pair[1].result === 'loss')
                col.a++;
            else if (pair[1].result === 'win' && pair[0].result === 'loss')
                col.b++;
            else if (pair.every(p => p.result === 'draw'))
                col.draws++;
            else
                col.neither++;
            out.set(key, row);
        }
} return [...out.values()]; }
