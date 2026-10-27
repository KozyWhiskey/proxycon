import type { EventBoard } from './event-board';
import { matchPlayers, currentRound, standingsFor } from './event-board-view';
import { chicagoToday, commanderKey, needsSeats, type StatGame, type Result } from './weekend';
export function eventDateState(event: {
    is_active?: boolean | null;
    start_date: string | null;
    end_date: string | null;
}, today = chicagoToday()) { if (event.is_active === false)
    return 'Closed'; if (event.start_date && today < event.start_date)
    return 'Upcoming'; if ((event.end_date || event.start_date) && today > (event.end_date || event.start_date)!)
    return 'Past dates'; return event.start_date ? 'Happening now' : 'Dates to be announced'; }
export function tableName(m: {
    table_number: number | null;
    table_label: string | null;
    is_final?: boolean | null;
}) { const base = m.is_final ? 'Final' : m.table_number ? 'Table ' + m.table_number : 'Game'; return m.table_label && m.table_label !== base ? base + ' · ' + m.table_label : base; }
export function roundName(m: {
    is_final: boolean | null;
    round_number: number | null;
}) { return m.is_final ? 'Final' : m.round_number ? 'Round ' + m.round_number : 'Tournament match'; }
export function resultText(players: {
    name: string;
    result: string | null;
    games_won: number | null;
}[], tournament = true) { if (players.length === 1)
    return players[0].name + ' received a bye'; const winner = players.filter(p => p.result === 'win'); const score = players.some(p => (p.games_won || 0) > 0); return (winner.length ? winner.map(p => p.name).join(' & ') + (players.length === 2 ? ' defeated ' + players.find(p => p.result !== 'win')?.name : ' won') : 'Draw') + (tournament ? (score ? ' · ' + players.map(p => p.games_won || 0).join('–') : ' · Score not recorded') : ''); }
export function boardGames(board: EventBoard): StatGame[] { return board.matches.flatMap(m => { const p = matchPlayers(board, m.id); if (!p.length || p.some(s => !s.result))
    return []; return p.filter(s => s.profile_id).map(s => { const d = board.decks.find(d => d.id === s.deck_id); return { matchId: m.id, profileId: s.profile_id!, result: s.result as Result, gameType: m.game_type, tournament: Boolean(m.tournament_id), bye: Boolean(m.tournament_id) && p.length === 1, playedOn: m.played_on || m.created_at.slice(0, 10), createdAt: m.created_at, commander: d ? commanderKey(d.commander_name, d.partner_name) : null, opponents: p.filter(o => o.profile_id && o.profile_id !== s.profile_id).map(o => o.profile_id!) }; }); }); }
export function boardPlaces(board: EventBoard) { return board.tournaments.flatMap(t => standingsFor(board, t.id).map(p => ({ tournamentId: t.id, profileId: p.profileId, place: t.status === 'completed' ? p.place : null, points: p.points, wins: p.wins, losses: p.losses, draws: p.draws }))); }
export function personalAssignments(board: EventBoard, profileId = board.userId) {
    if (!profileId)
        return [];
    const out: {
        id: string;
        href: string;
        context: string;
        title: string;
        detail: string;
        action: string;
        table?: string;
    }[] = [];
    for (const t of board.tournaments) {
        const mine = board.roster.find(p => p.tournament_id === t.id && p.profile_id === profileId);
        if (!mine)
            continue;
        const href = '/tournament/' + t.id;
        const context = board.event.name + ' · ' + t.name;
        const r = currentRound(board, t.id);
        const record = standingsFor(board, t.id).find(p => p.profileId === profileId);
        const suffix = record ? record.wins + (record.wins===1?' win / ':' wins / ') + record.losses + (record.losses===1?' loss / ':' losses / ') + record.draws + (record.draws===1?' draw':' draws') : '';
        if (mine.dropped) {
            out.push({ id: t.id, href, context, title: 'Dropped from tournament', detail: suffix, action: 'View tournament' });
            continue;
        }
        if (t.status === 'completed') {
            out.push({ id: t.id, href, context, title: mine.place ? ('Your place: ' + mine.place) : 'Tournament finished', detail: suffix, action: 'View final results' });
            continue;
        }
        const final = board.matches.find(m => m.tournament_id === t.id && m.is_final && matchPlayers(board, m.id).some(p => p.profile_id === profileId && !p.result));
        const active = final || r.matches.find(m => matchPlayers(board, m.id).some(p => p.profile_id === profileId));
        if (active) {
            const ps = matchPlayers(board, active.id);
            const me = ps.find(p => p.profile_id === profileId);
            const rest = ps.filter(p => p.profile_id !== profileId);
            if (ps.length === 1) {
                out.push({ id: t.id, href, context, title: 'You have a bye', detail: roundName(active) + ' · ' + suffix, action: 'View standings' });
                continue;
            }
            if (!me?.result) {
                out.push({ id: t.id, href: href + '/match/' + active.id, context, title: rest.map(p => p.name).join(' / '), table: tableName(active), detail: roundName(active) + ' · ' + (active.started_at ? 'Playing' : 'Pairings posted · Not started'), action: active.started_at ? 'Report result' : 'View match' });
                continue;
            }
        }
        const pending = r.matches.filter(m => matchPlayers(board, m.id).some(p => !p.result)).length;
        const allIn = r.round > 0 && pending === 0;
        const finalOpen = board.matches.some(m => m.tournament_id === t.id && m.is_final && matchPlayers(board, m.id).some(p => !p.result));
        if (allIn && r.round >= (t.max_rounds || 1) && !finalOpen) {
            out.push({ id: t.id, href, context, title: t.finished_at ? 'Places need confirming again' : 'All results in · places awaiting Finish', detail: suffix, action: 'Review places and finish' });
            continue;
        }
        if (active) {
            const me = matchPlayers(board, active.id).find(p => p.profile_id === profileId);
            out.push({ id: t.id, href, context, title: 'Result saved · waiting for the next game', detail: (me?.result ? roundName(active) + ' · ' + me.result + ' · ' : '') + (finalOpen ? 'Final pending' : pending + ' table' + (pending === 1 ? '' : 's') + ' still open'), action: 'View round' });
            continue;
        }
        out.push({ id: t.id, href: href + '#seating', context, title: needsSeats(t.format) ? mine.draft_seat ? 'Draft seat ' + mine.draft_seat : 'Choose a draft seat' : 'Joined · awaiting pairings', detail: (mine.pod ? 'Pod ' + mine.pod + ' · ' : '') + ((t.pod_orientations as Record<string, string> | null)?.[String(mine.pod || 1)] || 'Pairings not posted'), action: needsSeats(t.format) ? 'View seating' : 'View tournament' });
    }
    for (const m of board.matches.filter(m => !m.tournament_id)) {
        const p = matchPlayers(board, m.id);
        if (!p.some(p => p.profile_id === profileId && !p.result))
            continue;
        out.push({ id: m.id, href: '/events/' + board.event.id + '/match/' + m.id, context: board.event.name + ' · ' + (m.format_label || m.game_type), title: p.filter(p => p.profile_id !== profileId).map(p => p.name).join(' / '), table: m.format_label || 'Quick game', detail: 'Quick game · In progress', action: 'Report result' });
    }
    return out.map(a=>{const tournament=board.tournaments.find(t=>t.id===a.id);const participant=board.roster.find(p=>p.tournament_id===a.id&&p.profile_id===profileId);return {...a,inFlight:!tournament||(tournament.status!=='completed'&&!participant?.dropped)};}).sort((a, b) => { const priority = (x: typeof a) => x.table ? (board.tournaments.some(t => t.id === x.id) ? 0 : 2) : x.action === 'View round' || x.action === 'View standings' || x.action === 'Review places and finish' ? 1 : x.action === 'View final results' ? 4 : 3; return priority(a) - priority(b); });
}
