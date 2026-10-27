import type { EventBoard } from './event-board';
import { boardGames, boardPlaces } from './weekend-view';
import { inStatsFormat } from './weekend-statistics';
import { isCommanderFormat, placeLabel } from './weekend';
export type RecapSnapshot = {
    eventId: string;
    name: string;
    dates: string;
    generatedAt: string;
    version: string;
    lines: string[];
};
export function makeRecap(board: EventBoard): RecapSnapshot {
    const games = boardGames(board), places = boardPlaces(board);
    const lines: string[] = [];
    const formats = [['commander', 'Commander'], ['tournament', 'Tournament matches'], ['team', 'Team games'], ['other', 'Other games']];
    const completedIds = new Set(games.map(g => g.matchId));
    const open = board.matches.some(m => !completedIds.has(m.id)) || board.tournaments.some(t => t.status !== 'completed');
    lines.push(open ? 'Weekend so far' : 'Weekend recap', board.event.name, (board.event.start_date || '') + ' – ' + (board.event.end_date || ''), '', 'COMPLETED GAMES / MATCHES');
    for (const [f, label] of formats)
        lines.push(label + ': ' + new Set(games.filter(g => inStatsFormat(g, f)).map(g => g.matchId)).size);
    lines.push('', 'COMMANDER HIGHLIGHTS');
    const commanderGames = games.filter(g => !g.tournament && isCommanderFormat(g.gameType));
    const wins = board.members.map(m => ({ name: m.name, wins: commanderGames.filter(g => g.profileId === m.id && g.result === 'win').length, played: commanderGames.filter(g => g.profileId === m.id).length }));
    const max = Math.max(0, ...wins.map(w => w.wins));
    lines.push(max ? 'Most wins' + (wins.filter(w => w.wins === max).length > 1 ? ' (tied)' : '') + ': ' + wins.filter(w => w.wins === max).map(w => w.name).join(', ') + ' · ' + max : 'No Commander wins recorded.');
    const used = [...new Set(commanderGames.map(g => g.commander).filter((v): v is string => Boolean(v) && v !== 'No commander'))];
    for (const c of used)
        lines.push(c + ': ' + commanderGames.filter(g => g.commander === c && g.result === 'win').length + ' wins / ' + commanderGames.filter(g => g.commander === c).length + ' played');
    lines.push('', 'TOURNAMENT RESULTS');
    for (const t of board.tournaments) {
        lines.push(t.name + (t.status === 'completed' ? '' : ' · Places pending'));
        if (t.status === 'completed')
            for (const p of places.filter(p => p.tournamentId === t.id && p.place).sort((a, b) => a.place! - b.place!)) {
                const prize = p.place === 1 ? t.prize_1st : p.place === 2 ? t.prize_2nd : p.place === 3 ? t.prize_3rd : null;
                lines.push(placeLabel(p.place!) + ' ' + (board.names.get(p.profileId) || 'Player') + (prize ? ' · ' + prize : ''));
            }
    }
    if (!board.tournaments.length)
        lines.push('No tournaments.');
    lines.push('', 'PLAYER RECORDS · WINS / LOSSES / DRAWS');
    for (const m of board.members) {
        lines.push(m.name);
        for (const [f, label] of formats) {
            const g = games.filter(g => g.profileId === m.id && inStatsFormat(g, f));
            lines.push('  ' + label + ': ' + (g.length ? [g.filter(g => g.result === 'win' || g.bye).length, g.filter(g => g.result === 'loss' && !g.bye).length, g.filter(g => g.result === 'draw' && !g.bye).length].join(' / ') : 'No games'));
        }
    }
    const most = Math.max(0, ...board.members.map(m => games.filter(g => g.profileId === m.id).length));
    if (most)
        lines.push('', 'Most played: ' + board.members.filter(m => games.filter(g => g.profileId === m.id).length === most).map(m => m.name).join(', ') + ' · ' + most + ' completed games/matches');
    const version = JSON.stringify({ name: board.event.name, dates: [board.event.start_date, board.event.end_date], lines });
    return { eventId: board.event.id, name: board.event.name, dates: (board.event.start_date || '') + ' – ' + (board.event.end_date || ''), generatedAt: board.fetchedAt, version, lines };
}
