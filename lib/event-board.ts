import { resolvePlayer } from '@/lib/player-session';
import { cache } from 'react';
import { eventCapabilities } from '@/lib/event-capabilities';
import { chicagoToday, needsSeats, rankPlayers, type HistoryMatch, type Result } from '@/lib/weekend';

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

  const { data: memberRows } = await supabase
    .from('event_members')
    .select('profile_id, role, profile:profiles(id, display_name, username, color)')
    .eq('event_id', eventId);
  const members = (memberRows || []).map((row) => {
    const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
    return {
      id: row.profile_id as string,
      role: row.role as string,
      name: personName(profile),
      color: (profile?.color as string | null) || null,
    };
  }).filter((member) => member.id);

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, format, status, max_rounds, prizes_enabled, pod_count, field_locked, starts_on, product_note, brought_by, invite_code, prize_1st, prize_2nd, prize_3rd, round_duration_minutes, clock_round, clock_anchor, clock_paused_at, clock_remaining_seconds')
    .eq('event_id', eventId)
    .or('is_archived.eq.false,is_archived.is.null')
    .order('created_at', { ascending: false });

  const tournamentIds = (tournaments || []).map((tournament) => tournament.id);
  const { data: roster } = tournamentIds.length
    ? await supabase
      .from('tournament_participants')
      .select('id, tournament_id, profile_id, draft_seat, pod, dropped, place')
      .in('tournament_id', tournamentIds)
    : { data: [] as RosterRow[] };

  const { data: matches } = await supabase
    .from('matches')
    .select('id, tournament_id, round_number, table_number, table_label, game_type, format_label, started_at, completed_at, played_on, is_final, is_rematch, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  const matchIds = (matches || []).map((match) => match.id);
  const { data: seats } = matchIds.length
    ? await supabase
      .from('match_participants')
      .select('id, match_id, profile_id, participant_id, result, games_won, deck_id, team, seat_number, finish_order')
      .in('match_id', matchIds)
    : { data: [] as SeatRow[] };

  const { data: prizes } = await supabase
    .from('event_prizes')
    .select('id, name, note, awarded_to, tournament_id, place')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  const profileIds = [...new Set(members.map((member) => member.id))];
  const { data: decks } = profileIds.length
    ? await supabase
      .from('decks')
      .select('id, owner_id, name, commander_name, partner_name, image_url')
      .in('owner_id', profileIds)
    : { data: [] as DeckRow[] };

  const names = new Map(members.map((member) => [member.id, member.name]));
  for (const seat of seats || []) {
    if (seat.profile_id && !names.has(seat.profile_id)) names.set(seat.profile_id, 'Player');
  }

  return {
    userId: ctx.playerId,
    event,
    members,
    names,
    tournaments: tournaments || [],
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

export function nameOf(board: EventBoard, profileId: string | null | undefined) {
  if (!profileId) return 'Open seat';
  return board.names.get(profileId) || 'Player';
}

export function matchPlayers(board: EventBoard, matchId: string) {
  return board.seats
    .filter((seat) => seat.match_id === matchId)
    .map((seat) => ({
      ...seat,
      name: nameOf(board, seat.profile_id),
      result: (seat.result as Result | null) || null,
    }));
}

export function currentRound(board: EventBoard, tournamentId: string) {
  const rounds = board.matches.filter((match) => match.tournament_id === tournamentId && !match.is_final);
  const round = rounds.reduce((max, match) => Math.max(max, match.round_number || 0), 0);
  return { round, matches: rounds.filter((match) => (match.round_number || 0) === round && round > 0) };
}

export function standingsFor(board: EventBoard, tournamentId: string) {
  const roster = board.roster.filter((person) => person.tournament_id === tournamentId && person.profile_id);
  const history: HistoryMatch[] = [];
  for (const match of board.matches.filter((row) => row.tournament_id === tournamentId && !row.is_final)) {
    const seats = matchPlayers(board, match.id).filter((seat) => seat.participant_id && seat.result);
    if (seats.length === 1) {
      history.push({ player1: seats[0].participant_id!, player2: null, result1: 'win', result2: null });
    } else if (seats.length >= 2) {
      history.push({
        player1: seats[0].participant_id!,
        player2: seats[1].participant_id!,
        result1: seats[0].result || 'draw',
        result2: seats[1].result,
      });
    }
  }
  const ranked = rankPlayers(roster.map((person) => person.id), history);
  const standings = ranked.map((row) => {
    const person = roster.find((seat) => seat.id === row.id);
    return {
      ...row,
      profileId: person?.profile_id || '',
      name: nameOf(board, person?.profile_id),
      place: person?.place || null,
      dropped: Boolean(person?.dropped),
      seat: person?.draft_seat || null,
    };
  });
  if (board.tournaments.find(tournament => tournament.id === tournamentId)?.status === 'completed') {
    standings.sort((a, b) => (a.place ?? Infinity) - (b.place ?? Infinity));
  }
  return standings;
}

export function myOpenMatches(board: EventBoard) {
  if (!board.userId) return [];
  return board.matches.filter((match) => {
    const seats = matchPlayers(board, match.id);
    const mine = seats.some((seat) => seat.profile_id === board.userId && !seat.result);
    if (!mine) return false;
    if (!match.tournament_id) return true;
    return Boolean(match.started_at) || seats.length > 0;
  });
}

export function liveOrSetup(board: EventBoard) {
  return board.matches.filter((match) => {
    const seats = matchPlayers(board, match.id);
    const open = seats.length === 0 || seats.some((seat) => !seat.result);
    return open;
  });
}

export { chicagoToday, needsSeats };

export function gamesWonFor(board: EventBoard, tournamentId: string, participantId: string) {
  const matchIds = new Set(board.matches.filter(match => match.tournament_id === tournamentId && !match.is_final && board.seats.filter(seat => seat.match_id === match.id).length > 1).map(match => match.id));
  return board.seats.filter(seat => seat.participant_id === participantId && matchIds.has(seat.match_id)).reduce((sum, seat) => sum + (seat.games_won || 0), 0);
}
