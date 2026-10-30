import { resolvePlayer } from '@/lib/player-session';
import { loadEventBoard, loadEventContext, matchPlayers, type EventBoard } from '@/lib/event-board';
import { isCommanderFormat, isTeamFormat } from '@/lib/weekend';

export type HistoryQuery = Record<string, string | undefined>;
export function historyLimit(q: HistoryQuery) { return Math.floor(Math.max(20, Math.min(1000, Number(q.limit) || 20))); }

/** Same predicates are retained for rollout fallback and database/output equivalence tests. */
export function historyRows(b: EventBoard, q: HistoryQuery) {
  const completed = b.matches.filter(m => { const p = matchPlayers(b, m.id); return p.length && p.every(s => s.result); }).sort((a,b) => (b.completed_at || b.created_at).localeCompare(a.completed_at || a.created_at) || b.id.localeCompare(a.id));
  const rows = completed.filter(m => {
    const players = matchPlayers(b,m.id), title = b.tournaments.find(t => t.id === m.tournament_id)?.name || m.format_label || m.game_type;
    return (!q.day || q.day === 'all' || (m.played_on || m.created_at.slice(0,10)) === q.day)
      && (!q.player || q.player === 'all' || players.some(p => p.profile_id === q.player))
      && (!q.tournament || q.tournament === 'all' || m.tournament_id === q.tournament)
      && (!q.format || q.format === 'all' || (q.format === 'tournament' ? m.tournament_id : !m.tournament_id && (q.format === 'commander' ? isCommanderFormat(m.game_type) : q.format === 'team' ? isTeamFormat(m.game_type) : !isCommanderFormat(m.game_type) && !isTeamFormat(m.game_type))))
      && (!(q.q || '').trim() || (title + ' ' + players.map(p => p.name).join(' ')).toLowerCase().includes(q.q!.trim().toLowerCase()));
  });
  return { rows, days: [...new Set(completed.map(m => m.played_on || m.created_at.slice(0,10)))].sort() };
}

export async function loadEventHistory(id: string, q: HistoryQuery) {
  const ctx = await resolvePlayer();
  const [b, response] = await Promise.all([
    loadEventContext(id),
    ctx.supabase.rpc('weekend_history_page', { p_event:id, p_limit:historyLimit(q), p_day:q.day || 'all', p_player:q.player || 'all', p_format:q.format || 'all', p_tournament:q.tournament || 'all', p_search:(q.q || '').trim() }),
  ]);
  if (!b) return null;
  if (response.error) {
    // Safe rollout on a host whose additive read RPC is not deployed yet; network failures stay failures.
    if (!['PGRST202','42883'].includes(response.error.code)) throw new Error('Could not refresh game history. Try again.');
    const full = await loadEventBoard(id);
    if (!full) return null;
    const { rows, days } = historyRows(full,q);
    return { board:full, rows:rows.slice(0,historyLimit(q)), total:rows.length, days };
  }
  const page = response.data as { matches: EventBoard['matches']; seats: EventBoard['seats']; total:number; days:string[] };
  if (!page || !Array.isArray(page.matches) || !Array.isArray(page.seats)) throw new Error('Could not read game history.');
  const board: EventBoard = { ...b, matches:page.matches, seats:page.seats };
  return { board, rows:page.matches, total:Number(page.total), days:page.days };
}
