import { cache } from 'react';
import { resolvePlayer } from '@/lib/player-session';
import { loadEventShell } from '@/lib/event-shell';
import { readAll } from '@/lib/read-all';
import { profile } from '@/lib/performance';

export { personName } from '@/lib/event-shell';
const tournamentColumns = 'id, name, format, status, max_rounds, prizes_enabled, pod_count, field_locked, starts_on, product_note, brought_by, invite_code, prize_1st, prize_2nd, prize_3rd, round_duration_minutes, clock_round, clock_anchor, clock_paused_at, clock_remaining_seconds' as const;
const matchColumns = 'id, tournament_id, round_number, table_number, table_label, game_type, format_label, started_at, completed_at, played_on, is_final, is_rematch, created_at' as const;
type Scope = 'event' | 'room' | 'tournament' | 'match' | 'current' | 'context';

/** Keep canonical view calculations; retrieve only the inputs needed by a destination. */
const loadBoard = cache(async (eventId: string, scope: Scope, target = '') => profile('board.' + scope, async () => {
  const { supabase } = await resolvePlayer();
  const contextOnly = scope === 'context';
  const needsDecks = scope === 'event' || scope === 'match';
  const empty = <T,>() => Promise.resolve({ data: [] as T[], error: null });
  const matchesQuery = (from: number, to: number) => {
    let q = supabase.from('matches').select(matchColumns).eq('event_id', eventId);
    if (scope === 'room') q = q.not('tournament_id', 'is', null);
    if (scope === 'tournament') q = q.eq('tournament_id', target);
    if (scope === 'match') q = q.eq('id', target);
    if (scope === 'current') q = q.or('tournament_id.not.is.null,completed_at.is.null');
    return q.order('created_at', { ascending: false }).order('id').range(from, to);
  };
  // These queries are independent of match IDs and belong in the same waterfall stage.
  const [shell, tournamentResult, matchResult, prizeResult, extras] = await Promise.all([
    loadEventShell(eventId),
    supabase.from('tournaments').select(tournamentColumns).eq('event_id', eventId).or('is_archived.eq.false,is_archived.is.null').order('created_at', { ascending: false }),
    contextOnly ? empty<MatchRow>() : readAll(matchesQuery),
    scope === 'event' ? supabase.from('event_prizes').select('id, name, note, awarded_to, tournament_id, place').eq('event_id', eventId).order('created_at') : empty<PrizeRow>(),
    supabase.from('tournaments').select('id,pod_orientations,finished_at').eq('event_id', eventId),
  ]);
  if (!shell) return null;
  if (tournamentResult.error || matchResult.error || prizeResult.error) throw new Error('Could not refresh the event. Try again.');
  const profiles = shell.members.map(m => m.id);
  const tournamentIds = (tournamentResult.data || []).map(t => t.id);
  const matchIds = (matchResult.data || []).map(m => m.id);
  const [rosterResult, seatResult, deckResult] = await Promise.all([
    !contextOnly && scope !== 'match' && tournamentIds.length ? readAll((from, to) => {
      let q = supabase.from('tournament_participants').select('id, tournament_id, profile_id, draft_seat, pod, dropped, place').in('tournament_id', tournamentIds);
      if (scope === 'tournament') q = q.eq('tournament_id', target);
      return q.order('created_at').order('id').range(from, to);
    }) : empty<RosterRow>(),
    matchIds.length ? readMatchSeats(supabase, matchIds) : empty<SeatRow>(),
    needsDecks && profiles.length ? readAll((from, to) => supabase.from('decks').select('id, owner_id, name, commander_name, partner_name, image_url').in('owner_id', profiles).order('id').range(from, to)) : empty<DeckRow>(),
  ]);
  if (rosterResult.error || seatResult.error || deckResult.error) throw new Error('Could not refresh players or results. Try again.');
  const metadata = new Map((extras.data || []).map(t => [t.id, t]));
  const names = new Map(shell.names);
  for (const seat of seatResult.data || []) if (seat.profile_id && !names.has(seat.profile_id)) names.set(seat.profile_id, 'Player');
  return {
    ...shell, fetchedAt: new Date().toISOString(), names, upgradeRequired: Boolean(extras.error),
    tournaments: (tournamentResult.data || []).map(t => ({ ...t, pod_orientations: metadata.get(t.id)?.pod_orientations || {}, finished_at: metadata.get(t.id)?.finished_at || null })),
    roster: (rosterResult.data || []) as RosterRow[], matches: (matchResult.data || []) as MatchRow[],
    seats: (seatResult.data || []) as SeatRow[], prizes: (prizeResult.data || []) as PrizeRow[], decks: (deckResult.data || []) as DeckRow[],
  };
}));

async function readMatchSeats(supabase: Awaited<ReturnType<typeof resolvePlayer>>['supabase'], ids: string[]) {
  const data: SeatRow[] = [];
  // Bound URL length as well as PostgREST's row limit on longer weekends.
  for (let i = 0; i < ids.length; i += 400) {
    const chunks = Array.from({ length: Math.min(4, Math.ceil((ids.length-i)/100)) }, (_, j) => ids.slice(i+j*100,i+(j+1)*100));
    const results = await Promise.all(chunks.map(chunk => readAll((from, to) => supabase.from('match_participants').select('id, match_id, profile_id, participant_id, result, games_won, deck_id, team, seat_number, finish_order').in('match_id', chunk).order('created_at').order('id').range(from, to))));
    for (const result of results) {
      if (result.error) return { data: null, error: result.error };
      data.push(...result.data as SeatRow[]);
    }
  }
  return { data, error: null };
}

export const loadEventBoard = cache((id: string) => loadBoard(id, 'event'));
export const loadRoomBoard = cache((id: string) => loadBoard(id, 'room'));
export const loadTournamentBoard = cache((eventId: string, tournamentId: string) => loadBoard(eventId, 'tournament', tournamentId));
export const loadMatchBoard = cache((eventId: string, matchId: string) => loadBoard(eventId, 'match', matchId));
export const loadCurrentBoard = cache((id: string) => loadBoard(id, 'current'));
export const loadEventContext = cache((id: string) => loadBoard(id, 'context'));

interface MatchRow { id: string; tournament_id: string | null; round_number: number | null; table_number: number | null; table_label: string | null; game_type: string; format_label: string | null; started_at: string | null; completed_at: string | null; played_on: string | null; is_final: boolean | null; is_rematch: boolean | null; created_at: string }
interface PrizeRow { id: string; name: string; note: string | null; awarded_to: string | null; tournament_id: string | null; place: number | null }
interface RosterRow { id: string; tournament_id: string; profile_id: string | null; draft_seat: number | null; pod: number | null; dropped: boolean | null; place: number | null }
interface SeatRow { id: string; match_id: string; profile_id: string | null; participant_id: string | null; result: string | null; games_won: number | null; deck_id: string | null; team: number | null; seat_number: number | null; finish_order: number | null }
interface DeckRow { id: string; owner_id: string; name: string; commander_name: string | null; partner_name: string | null; image_url?: string | null }
export type EventBoard = NonNullable<Awaited<ReturnType<typeof loadEventBoard>>>;
