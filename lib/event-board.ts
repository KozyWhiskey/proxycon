import { resolvePlayer } from '@/lib/player-session';
import { cache } from 'react';
import { eventCapabilities } from '@/lib/event-capabilities';

export function personName(profile?: { display_name?: string | null; username?: string | null } | null) {
  return profile?.display_name || profile?.username || 'Player';
}

export const loadEventBoard = cache(async (eventId: string) => {
  const ctx = await resolvePlayer();
  const supabase = ctx.supabase;
  const { data: event } = await supabase
    .from('events')
    .select('id, name, start_date, end_date, invite_code, is_active')
    .eq('id', eventId)
    .maybeSingle();
  if (!event) return null;

  const [
    { data: memberRows, error:memberError },
    { data: tournaments, error:tournamentError },
    { data: matches, error:matchError },
    { data: prizes, error:prizeError },
  ] = await Promise.all([
    supabase
      .from('event_members')
      .select('profile_id, role, profile:profiles(id, display_name, username, color)')
      .eq('event_id', eventId),
    supabase
      .from('tournaments')
      .select('id, name, format, status, max_rounds, prizes_enabled, pod_count, field_locked, starts_on, product_note, brought_by, invite_code, prize_1st, prize_2nd, prize_3rd, round_duration_minutes, clock_round, clock_anchor, clock_paused_at, clock_remaining_seconds')
      .eq('event_id', eventId)
      .or('is_archived.eq.false,is_archived.is.null')
      .order('created_at', { ascending: false }),
    supabase
      .from('matches')
      .select('id, tournament_id, round_number, table_number, table_label, game_type, format_label, started_at, completed_at, played_on, is_final, is_rematch, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false }),
    supabase
      .from('event_prizes')
      .select('id, name, note, awarded_to, tournament_id, place')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true }),
  ]);

  if(memberError||tournamentError||matchError||prizeError)throw new Error('Could not refresh the event. Try again.');
  // Optional additive metadata must not hide existing tournaments before deployment.
  const {data:extras,error:metadataError}=await supabase.from('tournaments').select('id,pod_orientations,finished_at').eq('event_id',eventId);
  const metadata=new Map((extras||[]).map(t=>[t.id,t]));
  const members = (memberRows || []).map((row) => {
    const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
    return {
      id: row.profile_id as string,
      role: row.role as string,
      name: personName(profile),
      color: (profile?.color as string | null) || null,
    };
  }).filter((member) => member.id);

  const tournamentIds = (tournaments || []).map((tournament) => tournament.id);
  const matchIds = (matches || []).map((match) => match.id);
  const profileIds = [...new Set(members.map((member) => member.id))];

  const [
    { data: roster,error:rosterError },
    { data: seats,error:seatError },
    { data: decks,error:deckError },
  ] = await Promise.all([
    tournamentIds.length
      ? supabase
        .from('tournament_participants')
        .select('id, tournament_id, profile_id, draft_seat, pod, dropped, place')
        .in('tournament_id', tournamentIds)
      : Promise.resolve({ data: [] as RosterRow[],error:null }),
    matchIds.length
      ? supabase
        .from('match_participants')
        .select('id, match_id, profile_id, participant_id, result, games_won, deck_id, team, seat_number, finish_order')
        .in('match_id', matchIds)
      : Promise.resolve({ data: [] as SeatRow[],error:null }),
    profileIds.length
      ? supabase
        .from('decks')
        .select('id, owner_id, name, commander_name, partner_name, image_url')
        .in('owner_id', profileIds)
      : Promise.resolve({ data: [] as DeckRow[],error:null }),
  ]);

  if(rosterError||seatError||deckError)throw new Error('Could not refresh players or results. Try again.');
  const names = new Map(members.map((member) => [member.id, member.name]));
  for (const seat of seats || []) {
    if (seat.profile_id && !names.has(seat.profile_id)) names.set(seat.profile_id, 'Player');
  }

  return {
    fetchedAt: new Date().toISOString(),
    userId: ctx.playerId,
    event,
    members,
    names,
    upgradeRequired:Boolean(metadataError),
    tournaments: (tournaments||[]).map(t=>({...t,pod_orientations:metadata.get(t.id)?.pod_orientations||{},finished_at:metadata.get(t.id)?.finished_at||null})),
    roster: (roster || []) as RosterRow[],
    matches: matches || [],
    seats: (seats || []) as SeatRow[],
    prizes: prizes || [],
    decks: (decks || []) as DeckRow[],
    ...eventCapabilities({ authenticated: Boolean(ctx.authUser), playerId: ctx.playerId, house: ctx.mode === 'house', admin: ctx.isAdmin, member: members.some((member) => member.id === ctx.playerId) }),
  };
});

interface RosterRow {
  id: string;
  tournament_id: string;
  profile_id: string | null;
  draft_seat: number | null;
  pod: number | null;
  dropped: boolean | null;
  place: number | null;
}

interface SeatRow {
  id: string;
  match_id: string;
  profile_id: string | null;
  participant_id: string | null;
  result: string | null;
  games_won: number | null;
  deck_id: string | null;
  team: number | null;
  seat_number: number | null;
  finish_order: number | null;
}

interface DeckRow {
  id: string;
  owner_id: string;
  name: string;
  commander_name: string | null;
  partner_name: string | null;
  image_url?: string | null;
}

export type EventBoard = NonNullable<Awaited<ReturnType<typeof loadEventBoard>>>;

export {nameOf,matchPlayers,currentRound,standingsFor,myOpenMatches,liveOrSetup,gamesWonFor,chicagoToday,needsSeats} from './event-board-view';
