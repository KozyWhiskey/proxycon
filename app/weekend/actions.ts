'use server';

import { matchOutcome, matchesResultSnapshot, validTournamentScore, type ResultSnapshot } from '@/lib/match-outcome';
import { randomBytes } from 'crypto';
import { orderTiedPlaces, finalPlaces } from '@/lib/tournament-placement';
import { revalidatePath } from 'next/cache';
import { resolvePlayer } from '@/lib/player-session';
import {
  chartSeatCount,
  chicagoToday,
  draftRound1,
  finalHasWinner,
  emptyDraftSeats,
  podForSeat,
  isTournamentFormat,
  manualTieGroups,
  needsSeats,
  quickFormat,
  rankPlayers,
  sealedRound1,
  swissPairings,
  type HistoryMatch,
  type Pairing,
  type Result,
} from '@/lib/weekend';

type Db = Awaited<ReturnType<typeof resolvePlayer>>['supabase'];

export interface ActionResult {
  success: boolean;
  message?: string;
  needsOrder?: string[][];
}

function code() {
  return randomBytes(3).toString('hex').toUpperCase();
}

function refresh(eventId?: string | null, tournamentId?: string | null, matchId?: string | null) {
  revalidatePath('/');
  revalidatePath('/events');
  if (eventId) {
    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/events/${eventId}/room`);
    revalidatePath(`/events/${eventId}/stats`);
    revalidatePath(`/events/${eventId}/play`);
    if (matchId) revalidatePath(`/events/${eventId}/match/${matchId}`);
  }
  if (tournamentId) revalidatePath(`/tournament/${tournamentId}`);
}

async function session() {
  const ctx = await resolvePlayer();
  return {
    supabase: ctx.supabase,
    user: ctx.playerId && ctx.authUser ? { ...ctx.authUser, id: ctx.playerId } : null,
    house: ctx.mode === 'house',
    isAdmin: ctx.isAdmin,
    allowed: Boolean(ctx.authUser && (ctx.playerId || ctx.mode === 'house' || ctx.isAdmin)),
  };
}

async function requireMember(eventId: string, operator?: Awaited<ReturnType<typeof session>>) {
  const gate = operator ?? await session();
  if (!gate.allowed) return { ...gate, error: 'Choose your name first.' as const };
  if (gate.house || gate.isAdmin) return { ...gate, error: null };
  const { data: member } = await gate.supabase
    .from('event_members')
    .select('profile_id')
    .eq('event_id', eventId)
    .eq('profile_id', gate.user!.id)
    .maybeSingle();
  if (!member) return { ...gate, error: 'Join the event first.' as const };
  return { ...gate, error: null };
}

async function tournamentOf(supabase: Db, tournamentId: string) {
  const { data } = await supabase
    .from('tournaments')
    .select('id, event_id, name, format, status, max_rounds, prizes_enabled, pod_count, field_locked, is_archived, round_duration_minutes')
    .eq('id', tournamentId)
    .maybeSingle();
  return data;
}

export async function joinEventById(eventId: string): Promise<ActionResult> {
  const operator = await session();
  const { supabase, user } = operator;
  if (!user) return { success: false, message: 'Sign in first.' };

  const { data: event } = await supabase.from('events').select('id').eq('id', eventId).maybeSingle();
  if (!event) return { success: false, message: 'That event is not here.' };

  const { data: existing } = await supabase
    .from('event_members')
    .select('event_id')
    .eq('event_id', eventId)
    .eq('profile_id', user.id)
    .maybeSingle();
  if (existing) {
    refresh(eventId);
    return { success: true, message: 'You are already in this event.' };
  }

  const { error } = await supabase.from('event_members').insert({
    event_id: eventId,
    profile_id: user.id,
    role: 'player',
  });
  if (error) return { success: false, message: error.message };
  refresh(eventId);
  return { success: true, message: 'Joined.' };
}

export async function createWeekendTournament(input: {
  eventId: string;
  name: string;
  format: string;
  maxRounds: number;
  podCount: number;
  productNote?: string;
  bringing?: boolean;
  startsOn?: string;
  prize1st?: string;
  prize2nd?: string;
  prize3rd?: string;
  roundDuration?: number;
}): Promise<ActionResult & { tournamentId?: string }> {
  const gate = await requireMember(input.eventId);
  if (gate.error) return { success: false, message: gate.error || 'Sign in first.' };
  if (!isTournamentFormat(input.format)) return { success: false, message: 'A tournament is a draft, chaos draft, cube, or sealed.' };
  const rounds = Math.min(10, Math.max(1, input.maxRounds || 3));
  const pods = needsSeats(input.format) && input.podCount === 2 ? 2 : 1;

  const { data, error } = await gate.supabase
    .from('tournaments')
    .insert({
      event_id: input.eventId,
      name: input.name.trim() || 'Draft',
      format: input.format,
      status: 'pending',
      max_rounds: rounds,
      prizes_enabled: Boolean(input.prize1st?.trim() || input.prize2nd?.trim() || input.prize3rd?.trim()),
      pod_count: pods,
      field_locked: false,
      planned: false,
      card_source: input.format === 'chaos_draft' ? 'sets' : input.format === 'cube' ? 'cube' : 'set',
      starts_on: input.startsOn || chicagoToday(),
      invite_code: code(),
      brought_by: input.bringing && gate.user ? gate.user.id : null,
      product_note: input.productNote?.trim() || null,
      round_duration_minutes: Math.min(300, Math.max(1, input.roundDuration || 50)),
      prize_1st: input.prize1st?.trim() || null,
      prize_2nd: input.prize2nd?.trim() || null,
      prize_3rd: input.prize3rd?.trim() || null,
    })
    .select('id')
    .single();

  if (error || !data) return { success: false, message: error?.message || 'Could not create the tournament.' };
  refresh(input.eventId, data.id);
  return { success: true, tournamentId: data.id };
}

export async function joinTournament(tournamentId: string): Promise<ActionResult> {
  const { user } = await session();
  if (!user) return { success: false, message: 'Sign in first.' };
  return addTournamentPlayer(tournamentId, user.id);
}

export async function addTournamentPlayer(tournamentId: string, profileId: string): Promise<ActionResult> {
  const operator = await session();
  const { supabase, allowed } = operator;
  if (!allowed) return { success: false, message: 'Choose your name or open the house screen first.' };
  const tournament = await tournamentOf(supabase, tournamentId);
  if (!tournament?.event_id) return { success: false, message: 'Tournament not found.' };
  const gate = await requireMember(tournament.event_id, operator);
  if (gate.error) return { success: false, message: gate.error };
  if (tournament.field_locked || tournament.status === 'completed') {
    return { success: false, message: 'The field locked when round 1 started.' };
  }

  const { data: target } = await supabase.from('event_members').select('profile_id').eq('event_id', tournament.event_id).eq('profile_id', profileId).maybeSingle();
  if (!target) return { success: false, message: 'Add this player to the event first.' };

  const { data: existing } = await supabase
    .from('tournament_participants')
    .select('id, dropped')
    .eq('tournament_id', tournamentId)
    .eq('profile_id', profileId)
    .maybeSingle();
  if (existing && !existing.dropped) return { success: true, message: 'Already in the tournament.' };
  if (existing?.dropped) {
    const { error } = await supabase.from('tournament_participants').update({ dropped: false }).eq('id', existing.id);
    if (error) return { success: false, message: error.message };
  } else {
    const { error } = await supabase.from('tournament_participants').insert({
      tournament_id: tournamentId,
      profile_id: profileId,
      dropped: false,
      draft_seat: null,
      pod: null,
    });
    if (error) return { success: false, message: error.message };
  }
  refresh(tournament.event_id, tournamentId);
  return { success: true, message: 'Player added to the tournament.' };
}

async function roundState(supabase: Db, tournamentId: string) {
  const { data: matches } = await supabase
    .from('matches')
    .select('id, round_number, started_at, completed_at, table_label, table_number, is_final, is_rematch')
    .eq('tournament_id', tournamentId)
    .eq('is_final', false);
  const rows = matches || [];
  const round = rows.reduce((max, match) => Math.max(max, match.round_number || 0), 0);
  const current = rows.filter((match) => (match.round_number || 0) === round && round > 0);
  return { rows, round, current };
}

async function people(supabase: Db, tournamentId: string) {
  const { data } = await supabase
    .from('tournament_participants')
    .select('id, profile_id, draft_seat, pod, dropped, place')
    .eq('tournament_id', tournamentId);
  return data || [];
}

async function historyOf(supabase: Db, tournamentId: string): Promise<HistoryMatch[]> {
  const { data: matches } = await supabase
    .from('matches')
    .select('id, is_final')
    .eq('tournament_id', tournamentId)
    .eq('is_final', false);
  const ids = (matches || []).map((match) => match.id);
  if (ids.length === 0) return [];
  const { data: seats } = await supabase
    .from('match_participants')
    .select('match_id, participant_id, result')
    .in('match_id', ids);
  const grouped = new Map<string, { participant_id: string | null; result: string | null }[]>();
  for (const seat of seats || []) {
    const list = grouped.get(seat.match_id) || [];
    list.push(seat);
    grouped.set(seat.match_id, list);
  }
  const history: HistoryMatch[] = [];
  for (const [matchId, seatsInMatch] of grouped) {
    // A dropped opponent remains part of a played match, never a synthetic bye.
    const recorded = seatsInMatch.filter((seat) => seat.result && seat.participant_id);
    if (recorded.length === 0) continue;
    if (recorded.length === 1) {
      history.push({ player1: recorded[0].participant_id!, player2: null, result1: 'win', result2: null });
      continue;
    }
    history.push({
      player1: recorded[0].participant_id!,
      player2: recorded[1].participant_id!,
      result1: recorded[0].result as Result,
      result2: recorded[1].result as Result,
    });
    void matchId;
  }
  return history;
}

async function writePairings(supabase: Db, tournament: { id: string; event_id: string | null; format: string }, round: number, pairings: Pairing[]) {
  const roster = await people(supabase, tournament.id);
  const find = (id: string) => roster.find((person) => person.id === id);
  let table = 1;
  for (const pairing of pairings) {
    const first = find(pairing.player1);
    const second = pairing.player2 ? find(pairing.player2) : null;
    if (!first) continue;
    const { data: match, error } = await supabase
      .from('matches')
      .insert({
        tournament_id: tournament.id,
        event_id: tournament.event_id,
        round_number: round,
        game_type: tournament.format,
        table_number: table,
        table_label: pairing.player2 ? `Table ${table}` : 'Bye',
        is_rematch: pairing.rematch,
        is_final: false,
        played_on: chicagoToday(),
        join_code: code(),
      })
      .select('id')
      .single();
    if (error || !match) return error?.message || 'Could not post a table.';
    const rows = [
      {
        match_id: match.id,
        profile_id: first.profile_id,
        participant_id: first.id,
        seat_number: first.draft_seat,
        result: null,
      },
    ];
    if (second) {
      rows.push({
        match_id: match.id,
        profile_id: second.profile_id,
        participant_id: second.id,
        seat_number: second.draft_seat,
        result: null,
      });
    }
    const { error: peopleError } = await supabase.from('match_participants').insert(rows);
    if (peopleError) return peopleError.message;
    table += 1;
  }
  return null;
}

export async function postPairings(tournamentId: string): Promise<ActionResult> {
  const operator = await session();
  const { supabase, allowed } = operator;
  if (!allowed) return { success: false, message: 'Choose your name or open the house screen first.' };
  const tournament = await tournamentOf(supabase, tournamentId);
  if (!tournament?.event_id) return { success: false, message: 'Tournament not found.' };
  const gate = await requireMember(tournament.event_id, operator);
  if (gate.error) return { success: false, message: gate.error };
  if (tournament.status === 'completed') return { success: false, message: 'This tournament is finished.' };

  const state = await roundState(supabase, tournamentId);
  if (state.current.some((match) => !match.started_at)) {
    return { success: false, message: 'Pairings are already posted. Start the round, or clear them.' };
  }
  if (state.current.length > 0) {
    const open = await openTables(supabase, state.current.map((match) => match.id));
    if (open.length > 0) return { success: false, message: `Still open: ${open.join(', ')}.` };
  }
  const nextRound = state.round + 1;
  const { data: alreadyPosted } = await supabase
    .from('matches')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('round_number', nextRound)
    .eq('is_final', false)
    .limit(1);
  if (alreadyPosted && alreadyPosted.length > 0) {
    return { success: false, message: 'Pairings are already posted. Start the round, or clear them.' };
  }
  if (state.round >= (tournament.max_rounds || 1) && state.round > 0) {
    return { success: false, message: 'The set rounds are done. Finish, or add the top-two final.' };
  }

  const roster = (await people(supabase, tournamentId)).filter((person) => person.profile_id && !person.dropped);
  if (roster.length < 2) return { success: false, message: 'At least two people need to join.' };

  let pairings: Pairing[] = [];
  if (nextRound === 1 && needsSeats(tournament.format)) {
    if (roster.some((person) => !person.draft_seat)) {
      return { success: false, message: 'Seat everyone, or fill the empty seats, before posting pairings.' };
    }
    pairings = draftRound1(
      roster.map((person) => ({
        id: person.id,
        seat: person.draft_seat || 0,
        pod: tournament.pod_count === 2 ? (person.pod || 1) : 1,
      })),
      Math.random
    );
  } else if (nextRound === 1) {
    pairings = sealedRound1(roster.map((person) => person.id), Math.random);
  } else {
    const history = await historyOf(supabase, tournamentId);
    pairings = swissPairings(
      roster.map((person) => ({
        id: person.id,
        points: 0,
        byes: 0,
        seat: person.draft_seat,
      })),
      history,
      Math.random,
      !needsSeats(tournament.format)
    );
  }

  const failure = await writePairings(supabase, tournament, nextRound, pairings);
  if (failure) {
    const duplicate = failure.toLowerCase().includes('duplicate') || failure.includes('matches_tournament_round_table');
    return { success: false, message: duplicate ? 'Pairings are already posted. Start the round, or clear them.' : failure };
  }
  if (!tournament.field_locked) {
    await supabase.from('tournaments').update({ status: 'pending' }).eq('id', tournamentId);
  }
  refresh(tournament.event_id, tournamentId);
  return { success: true, message: `Round ${nextRound} pairings posted.` };
}

async function openTables(supabase: Db, matchIds: string[]) {
  if (matchIds.length === 0) return [];
  const { data: seats } = await supabase
    .from('match_participants')
    .select('match_id, result')
    .in('match_id', matchIds);
  const { data: matches } = await supabase
    .from('matches')
    .select('id, table_label, table_number')
    .in('id', matchIds);
  return (matches || [])
    .filter((match) => {
      const rows = (seats || []).filter((seat) => seat.match_id === match.id);
      return rows.length === 0 || rows.some((seat) => !seat.result);
    })
    .map((match) => match.table_label || `Table ${match.table_number}`);
}

export async function clearPairings(tournamentId: string): Promise<ActionResult> {
  const operator = await session();
  const { supabase, allowed } = operator;
  if (!allowed) return { success: false, message: 'Choose your name or open the house screen first.' };
  const tournament = await tournamentOf(supabase, tournamentId);
  if (!tournament?.event_id) return { success: false, message: 'Tournament not found.' };
  const gate = await requireMember(tournament.event_id, operator);
  if (gate.error) return { success: false, message: gate.error };
  const state = await roundState(supabase, tournamentId);
  if (state.current.length === 0) return { success: false, message: 'No pairings are posted.' };
  if (state.current.some((match) => match.started_at)) {
    return { success: false, message: 'The round has started. Those pairings stay.' };
  }
  const ids = state.current.map((match) => match.id);
  await supabase.from('match_participants').delete().in('match_id', ids);
  await supabase.from('matches').delete().in('id', ids);
  refresh(tournament.event_id, tournamentId);
  return { success: true, message: 'Pairings cleared. The tournament is back in setup.' };
}

export async function startRound(tournamentId: string): Promise<ActionResult> {
  const operator = await session();
  const { supabase, allowed } = operator;
  if (!allowed) return { success: false, message: 'Choose your name or open the house screen first.' };
  const tournament = await tournamentOf(supabase, tournamentId);
  if (!tournament?.event_id) return { success: false, message: 'Tournament not found.' };
  const gate = await requireMember(tournament.event_id, operator);
  if (gate.error) return { success: false, message: gate.error };
  const state = await roundState(supabase, tournamentId);
  if (state.current.length === 0) return { success: false, message: 'Post pairings first.' };
  if (state.current.some((match) => match.started_at)) return { success: false, message: 'This round has already started.' };

  const now = new Date().toISOString();
  const minutes = Math.min(300, Math.max(1, tournament.round_duration_minutes || 50));
  await supabase.from('matches').update({ started_at: now }).in('id', state.current.map((match) => match.id));

  const { data: seats } = await supabase
    .from('match_participants')
    .select('id, match_id')
    .in('match_id', state.current.map((match) => match.id));
  const counts = new Map<string, number>();
  for (const seat of seats || []) counts.set(seat.match_id, (counts.get(seat.match_id) || 0) + 1);
  const byeIds = [...counts.entries()].filter(([, count]) => count === 1).map(([id]) => id);
  if (byeIds.length > 0) {
    await supabase.from('match_participants').update({ result: 'win', games_won: null }).in('match_id', byeIds);
    await supabase.from('matches').update({ completed_at: now }).in('id', byeIds);
  }

  await supabase
    .from('tournaments')
    .update({
      status: 'active',
      field_locked: state.round === 1 ? true : tournament.field_locked,
      round_duration_minutes: minutes,
      clock_round: state.round,
      clock_anchor: now,
      clock_paused_at: null,
      clock_remaining_seconds: minutes * 60,
    })
    .eq('id', tournamentId);

  refresh(tournament.event_id, tournamentId);
  return { success: true, message: 'Round started. The field and the pairings are locked.' };
}

export async function pauseRoundClock(tournamentId: string): Promise<ActionResult> {
  const operator = await session();
  const { supabase, allowed } = operator;
  if (!allowed) return { success: false, message: 'Choose your name or open the house screen first.' };
  const tournament = await tournamentOf(supabase, tournamentId);
  if (!tournament?.event_id) return { success: false, message: 'Tournament not found.' };
  const gate = await requireMember(tournament.event_id, operator);
  if (gate.error) return { success: false, message: gate.error };

  const { data: clock } = await supabase
    .from('tournaments')
    .select('clock_anchor, clock_paused_at, clock_remaining_seconds')
    .eq('id', tournamentId)
    .maybeSingle();
  if (!clock?.clock_anchor || clock.clock_remaining_seconds == null) return { success: false, message: 'The clock has not started.' };
  if (clock.clock_paused_at) return { success: false, message: 'The clock is already paused.' };

  const elapsed = Math.max(0, Math.floor((Date.now() - Date.parse(clock.clock_anchor)) / 1000));
  const remaining = Math.max(0, clock.clock_remaining_seconds - elapsed);
  const { error } = await supabase
    .from('tournaments')
    .update({ clock_paused_at: new Date().toISOString(), clock_remaining_seconds: remaining })
    .eq('id', tournamentId);
  if (error) return { success: false, message: error.message };
  refresh(tournament.event_id, tournamentId);
  return { success: true, message: 'Clock paused.' };
}

export async function resumeRoundClock(tournamentId: string): Promise<ActionResult> {
  const operator = await session();
  const { supabase, allowed } = operator;
  if (!allowed) return { success: false, message: 'Choose your name or open the house screen first.' };
  const tournament = await tournamentOf(supabase, tournamentId);
  if (!tournament?.event_id) return { success: false, message: 'Tournament not found.' };
  const gate = await requireMember(tournament.event_id, operator);
  if (gate.error) return { success: false, message: gate.error };

  const { data: clock } = await supabase
    .from('tournaments')
    .select('clock_paused_at, clock_remaining_seconds')
    .eq('id', tournamentId)
    .maybeSingle();
  if (!clock?.clock_paused_at) return { success: false, message: 'The clock is running.' };
  const { error } = await supabase
    .from('tournaments')
    .update({ clock_anchor: new Date().toISOString(), clock_paused_at: null })
    .eq('id', tournamentId);
  if (error) return { success: false, message: error.message };
  refresh(tournament.event_id, tournamentId);
  return { success: true, message: 'Clock resumed.' };
}

export async function setTournamentSetup(input: {
  tournamentId: string;
  maxRounds?: number;
  prizesEnabled?: boolean;
  podCount?: number;
  productNote?: string;
  bringing?: boolean | null;
  prize1st?: string;
  prize2nd?: string;
  prize3rd?: string;
  roundDuration?: number;
}): Promise<ActionResult> {
  const operator = await session();
  const { supabase, allowed, user } = operator;
  if (!allowed) return { success: false, message: 'Choose your name or open the house screen first.' };
  const tournament = await tournamentOf(supabase, input.tournamentId);
  if (!tournament?.event_id) return { success: false, message: 'Tournament not found.' };
  const gate = await requireMember(tournament.event_id, operator);
  if (gate.error) return { success: false, message: gate.error };

  const patch: Record<string, unknown> = {};
  if (typeof input.maxRounds === 'number') {
    if (tournament.field_locked) return { success: false, message: 'Round count locked when round 1 started.' };
    patch.max_rounds = Math.min(10, Math.max(1, input.maxRounds));
  }
  if (typeof input.prizesEnabled === 'boolean' && tournament.status !== 'completed') {
    patch.prizes_enabled = input.prizesEnabled;
  }
  if (typeof input.podCount === 'number') {
    const state = await roundState(supabase, input.tournamentId);
    if (state.rows.length > 0) return { success: false, message: 'Pods lock when pairings are posted.' };
    patch.pod_count = needsSeats(tournament.format) && input.podCount === 2 ? 2 : 1;
  }
  if (typeof input.productNote === 'string') patch.product_note = input.productNote.trim() || null;
  if (typeof input.prize1st === 'string' || typeof input.prize2nd === 'string' || typeof input.prize3rd === 'string') {
    if (typeof input.prize1st === 'string') patch.prize_1st = input.prize1st.trim() || null;
    if (typeof input.prize2nd === 'string') patch.prize_2nd = input.prize2nd.trim() || null;
    if (typeof input.prize3rd === 'string') patch.prize_3rd = input.prize3rd.trim() || null;
    const { data: current } = await supabase
      .from('tournaments')
      .select('prize_1st, prize_2nd, prize_3rd')
      .eq('id', input.tournamentId)
      .maybeSingle();
    const first = typeof input.prize1st === 'string' ? input.prize1st.trim() : (current?.prize_1st || '');
    const second = typeof input.prize2nd === 'string' ? input.prize2nd.trim() : (current?.prize_2nd || '');
    const third = typeof input.prize3rd === 'string' ? input.prize3rd.trim() : (current?.prize_3rd || '');
    patch.prizes_enabled = Boolean(first || second || third);
  }
  if (typeof input.roundDuration === 'number') {
    const minutes = Math.min(300, Math.max(1, input.roundDuration));
    patch.round_duration_minutes = minutes;
    const state = await roundState(supabase, input.tournamentId);
    if (state.current.some((match) => match.started_at)) {
      patch.clock_round = state.round;
      patch.clock_remaining_seconds = minutes * 60;
      patch.clock_anchor = new Date().toISOString();
      patch.clock_paused_at = null;
    }
  }
  if (input.bringing === true && user) patch.brought_by = user.id;
  if (input.bringing === false) patch.brought_by = null;

  if (Object.keys(patch).length === 0) return { success: true };
  const { error } = await supabase.from('tournaments').update(patch).eq('id', input.tournamentId);
  if (error) return { success: false, message: error.message };
  refresh(tournament.event_id, input.tournamentId);
  return { success: true, message: 'Saved.' };
}

export async function addSeat(tournamentId: string): Promise<ActionResult> {
  const operator = await session();
  const { supabase, allowed } = operator;
  if (!allowed) return { success: false, message: 'Choose your name or open the house screen first.' };
  const tournament = await tournamentOf(supabase, tournamentId);
  if (!tournament?.event_id) return { success: false, message: 'Tournament not found.' };
  const gate = await requireMember(tournament.event_id, operator);
  if (gate.error) return { success: false, message: gate.error };
  if (!needsSeats(tournament.format)) return { success: false, message: 'Sealed does not use seats.' };
  const state = await roundState(supabase, tournamentId);
  if (state.rows.length > 0) return { success: false, message: 'Seats froze when pairings were posted.' };

  const roster = await people(supabase, tournamentId);
  const next = chartSeatCount(roster.map(person => person.draft_seat || 0), roster.filter(person => person.profile_id).length) + 1;
  const pod = podForNewSeat(roster, tournament.pod_count || 1, next);
  const { error } = await supabase.from('tournament_participants').insert({
    tournament_id: tournamentId,
    profile_id: null,
    draft_seat: next,
    pod,
    dropped: false,
  });
  if (error) return { success: false, message: error.message };
  refresh(tournament.event_id, tournamentId);
  return { success: true, message: `Seat ${next} added.` };
}

function podForNewSeat(roster: { draft_seat: number | null; profile_id: string | null }[], podCount: number, seat: number) {
  const seatCount = chartSeatCount(
    roster.map((person) => person.draft_seat || 0),
    roster.filter((person) => person.profile_id).length,
  );
  return podForSeat(podCount, seat, seatCount);
}

export async function claimSeat(tournamentId: string, seatNumber: number): Promise<ActionResult> {
  const operator = await session();
  const { supabase, user } = operator;
  if (!user) return { success: false, message: 'Sign in first.' };
  const tournament = await tournamentOf(supabase, tournamentId);
  if (!tournament?.event_id) return { success: false, message: 'Tournament not found.' };
  const gate = await requireMember(tournament.event_id, operator);
  if (gate.error) return { success: false, message: gate.error };
  const state = await roundState(supabase, tournamentId);
  if (state.rows.length > 0) return { success: false, message: 'Seats froze when pairings were posted.' };

  const roster = await people(supabase, tournamentId);
  const seat = roster.find((person) => person.draft_seat === seatNumber);
  if (seat?.profile_id && seat.profile_id !== user.id) return { success: false, message: 'That seat is already claimed.' };
  const mine = roster.find((person) => person.profile_id === user.id && !person.dropped);
  if (!mine && !seat) return { success: false, message: 'Join the tournament first.' };

  if (seat && !seat.profile_id) {
    if (mine && mine.id !== seat.id) {
      await supabase.from('tournament_participants').delete().eq('id', mine.id);
    }
    await supabase.from('tournament_participants').update({ profile_id: user.id, pod: seat.pod || podForNewSeat(roster, tournament.pod_count || 1, seatNumber) }).eq('id', seat.id);
  } else if (mine) {
    await supabase.from('tournament_participants').update({
      draft_seat: seatNumber,
      pod: podForNewSeat(roster, tournament.pod_count || 1, seatNumber),
    }).eq('id', mine.id);
  } else {
    await supabase.from('tournament_participants').insert({
      tournament_id: tournamentId,
      profile_id: user.id,
      draft_seat: seatNumber,
      pod: podForNewSeat(roster, tournament.pod_count || 1, seatNumber),
      dropped: false,
    });
  }

  refresh(tournament.event_id, tournamentId);
  return { success: true, message: `Seat ${seatNumber} is yours.` };
}

export async function moveSeat(tournamentId: string, participantId: string, seatNumber: number): Promise<ActionResult> {
  const operator = await session();
  const { supabase, allowed } = operator;
  if (!allowed) return { success: false, message: 'Choose your name or open the house screen first.' };
  const tournament = await tournamentOf(supabase, tournamentId);
  if (!tournament?.event_id) return { success: false, message: 'Tournament not found.' };
  const gate = await requireMember(tournament.event_id, operator);
  if (gate.error) return { success: false, message: gate.error };
  const state = await roundState(supabase, tournamentId);
  if (needsSeats(tournament.format) && state.rows.length > 0) {
    return { success: false, message: 'Draft seats froze when pairings were posted.' };
  }

  const roster = await people(supabase, tournamentId);
  const person = roster.find((row) => row.id === participantId && row.profile_id);
  if (!person) return { success: false, message: 'That player is not in the tournament.' };
  if (seatNumber < 1) return { success: false, message: 'Pick a seat.' };
  const occupied = roster.find((row) => row.draft_seat === seatNumber && row.id !== participantId);
  if (occupied?.profile_id) {
    const { error: clearError } = await supabase
      .from('tournament_participants')
      .update({ draft_seat: null })
      .in('id', [person.id, occupied.id]);
    if (clearError) return { success: false, message: clearError.message };
    if (person.draft_seat) {
      const { error: swapError } = await supabase
        .from('tournament_participants')
        .update({ draft_seat: person.draft_seat, pod: person.pod })
        .eq('id', occupied.id);
      if (swapError) return { success: false, message: swapError.message };
    }
  } else if (occupied) {
    const { error: deleteError } = await supabase.from('tournament_participants').delete().eq('id', occupied.id);
    if (deleteError) return { success: false, message: deleteError.message };
  }
  const { error } = await supabase.from('tournament_participants').update({
    draft_seat: seatNumber,
    pod: occupied?.pod || podForNewSeat(roster, tournament.pod_count || 1, seatNumber),
  }).eq('id', participantId);
  if (error) return { success: false, message: error.message };
  refresh(tournament.event_id, tournamentId);
  return { success: true, message: 'Seat moved.' };
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

export async function randomizeSeats(tournamentId: string, mode: 'fill' | 'reshuffle'): Promise<ActionResult> {
  const operator = await session();
  const { supabase, allowed } = operator;
  if (!allowed) return { success: false, message: 'Choose your name or open the house screen first.' };
  const tournament = await tournamentOf(supabase, tournamentId);
  if (!tournament?.event_id) return { success: false, message: 'Tournament not found.' };
  const gate = await requireMember(tournament.event_id, operator);
  if (gate.error) return { success: false, message: gate.error };
  if (!needsSeats(tournament.format)) return { success: false, message: 'Sealed does not use seats.' };
  const state = await roundState(supabase, tournamentId);
  if (state.rows.length > 0) return { success: false, message: 'Clear the pairings before randomizing seats.' };

  const roster = (await people(supabase, tournamentId)).filter((person) => !person.dropped);
  const joined = roster.filter((person) => person.profile_id);
  if (joined.length === 0) return { success: false, message: 'Nobody has joined yet.' };

  if (mode === 'reshuffle') {
    const empties = roster.filter((person) => !person.profile_id).map((person) => person.id);
    if (empties.length) {
      const { error } = await supabase.from('tournament_participants').delete().in('id', empties);
      if (error) return { success: false, message: error.message };
    }
    const { error: clearError } = await supabase
      .from('tournament_participants')
      .update({ draft_seat: null })
      .in('id', joined.map((person) => person.id));
    if (clearError) return { success: false, message: clearError.message };
    const order = shuffle(joined);
    for (let index = 0; index < order.length; index += 1) {
      const seat = index + 1;
      const pod = (tournament.pod_count || 1) === 2 && seat > Math.ceil(order.length / 2) ? 2 : 1;
      const { error } = await supabase.from('tournament_participants').update({ draft_seat: seat, pod }).eq('id', order[index].id);
      if (error) return { success: false, message: error.message };
    }
  } else {
    const claimed = new Set(joined.filter((person) => person.draft_seat).map((person) => person.draft_seat as number));
    const unseated = joined.filter((person) => !person.draft_seat);
    const emptyRows = roster.filter((person) => !person.profile_id && person.draft_seat);
    const seatNumbers = roster.map((person) => person.draft_seat || 0);
    const emptyNumbers = emptyDraftSeats(seatNumbers, [...claimed], joined.length);
    let next = chartSeatCount(seatNumbers, joined.length);
    for (const person of unseated) {
      let seat = emptyNumbers.shift();
      if (!seat) {
        next += 1;
        seat = next;
      }
      const emptyRow = emptyRows.find((row) => row.draft_seat === seat);
      const pod = emptyRow?.pod || podForNewSeat(roster, tournament.pod_count || 1, seat);
      if (emptyRow) {
        const { error } = await supabase.from('tournament_participants').delete().eq('id', emptyRow.id);
        if (error) return { success: false, message: error.message };
      }
      const { error } = await supabase.from('tournament_participants').update({ draft_seat: seat, pod }).eq('id', person.id);
      if (error) return { success: false, message: error.message };
    }
    // Growing the chart can move the pod boundary. Keep every claimed seat,
    // then align all pod labels with the final chart (six seats split 3 + 3).
    if (tournament.pod_count === 2) {
      const seated = (await people(supabase, tournamentId)).filter(person => !person.dropped && person.draft_seat);
      const count = chartSeatCount(seated.map(person => person.draft_seat || 0), joined.length);
      for (const person of seated) {
        const pod = podForSeat(2, person.draft_seat!, count);
        if (person.pod === pod) continue;
        const { error } = await supabase.from('tournament_participants').update({ pod }).eq('id', person.id);
        if (error) return { success: false, message: error.message };
      }
    }
  }

  refresh(tournament.event_id, tournamentId);
  return { success: true, message: mode === 'fill' ? 'Empty seats filled.' : 'Seats reshuffled.' };
}

export async function swapSealedPair(tournamentId: string, participantA: string, participantB: string): Promise<ActionResult> {
  const operator = await session();
  const { supabase, allowed } = operator;
  if (!allowed) return { success: false, message: 'Choose your name or open the house screen first.' };
  const tournament = await tournamentOf(supabase, tournamentId);
  if (!tournament?.event_id) return { success: false, message: 'Tournament not found.' };
  if (needsSeats(tournament.format)) return { success: false, message: 'Draft pairings are not swapped.' };
  const gate = await requireMember(tournament.event_id, operator);
  if (gate.error) return { success: false, message: gate.error };
  const state = await roundState(supabase, tournamentId);
  if (state.round !== 1 || state.current.some((match) => match.started_at)) {
    return { success: false, message: 'Swaps close when the round starts.' };
  }
  const ids = state.current.map((match) => match.id);
  const { data: seats } = await supabase
    .from('match_participants')
    .select('id, match_id, participant_id')
    .in('match_id', ids);
  const a = (seats || []).find((seat) => seat.participant_id === participantA);
  const b = (seats || []).find((seat) => seat.participant_id === participantB);
  if (!a || !b) return { success: false, message: 'Both players need a posted pairing.' };
  await supabase.from('match_participants').update({ match_id: b.match_id }).eq('id', a.id);
  await supabase.from('match_participants').update({ match_id: a.match_id }).eq('id', b.id);
  refresh(tournament.event_id, tournamentId);
  return { success: true, message: 'Those two swapped.' };
}

async function advanceIfReady(supabase: Db, tournamentId: string): Promise<string | null> {
  const tournament = await tournamentOf(supabase, tournamentId);
  if (!tournament || tournament.status === 'completed') return null;
  const state = await roundState(supabase, tournamentId);
  if (state.round === 0 || state.current.length === 0) return null;

  const unstarted = state.current.every((match) => !match.started_at);
  if (unstarted) {
    if (state.round < 2) return null;
    const previousIds = state.rows
      .filter((match) => match.round_number === state.round - 1)
      .map((match) => match.id);
    const previousOpen = await openTables(supabase, previousIds);
    if (previousOpen.length > 0 || previousIds.length === 0) return null;
    const ids = state.current.map((match) => match.id);
    const { data: removed, error } = await supabase
      .from('matches')
      .delete()
      .in('id', ids)
      .is('started_at', null)
      .select('id');
    if (error || (removed || []).length !== ids.length) return null;
  } else {
    const open = await openTables(supabase, state.current.map((match) => match.id));
    if (open.length > 0) return null;
    if (state.round >= (tournament.max_rounds || 1)) return 'The set rounds are done. Finish when you are ready.';
  }

  const posted = await postPairings(tournamentId);
  if (!posted.success) {
    if (posted.message?.includes('set rounds')) return 'The set rounds are done. Finish when you are ready.';
    return null;
  }
  return posted.message || 'Next round posted.';
}

async function clearFinish(supabase: Db, tournamentId: string, eventId: string) {
  await supabase.from('tournament_participants').update({ place: null }).eq('tournament_id', tournamentId);
  await supabase.from('tournaments').update({ status: 'active' }).eq('id', tournamentId);
  refresh(eventId, tournamentId);
}

export async function reportMatch(input: {
  matchId: string;
  draw?: boolean;
  winnerIds?: string[];
  games?: Record<string, number>;
  decks?: Record<string, string | null>;
  finishOrder?: string[];
  expected?: ResultSnapshot[];
}): Promise<ActionResult> {
  const operator = await session();
  const { supabase, allowed } = operator;
  if (!allowed) return { success: false, message: 'Choose your name or open the house screen first.' };
  const { data: match } = await supabase
    .from('matches')
    .select('id, event_id, tournament_id, started_at, game_type, round_number, is_final')
    .eq('id', input.matchId)
    .maybeSingle();
  if (!match?.event_id) return { success: false, message: 'Game not found.' };
  const gate = await requireMember(match.event_id, operator);
  if (gate.error) return { success: false, message: gate.error };
  if (match.tournament_id && !match.started_at) return { success: false, message: 'Start the round before entering a result.' };

  const { data: seats } = await supabase
    .from('match_participants')
    .select('*')
    .eq('match_id', match.id);
  const rows = seats || [];
  if (rows.length === 0) return { success: false, message: 'Nobody is in this game.' };
  if (input.expected && !matchesResultSnapshot(rows, input.expected)) return { success: false, message: 'This result changed while you were editing. Review the current result before saving your correction.' };

  const seatedIds = rows.map((seat) => seat.profile_id).filter((id): id is string => Boolean(id));
  if (match.tournament_id && !validTournamentScore(seatedIds, input.games)) {
    return { success: false, message: 'Enter games won for each player before saving. Use whole numbers; 0–0 is not a result.' };
  }
  if (input.games && seatedIds.length >= 2) {
    const scores = input.games;
    if (seatedIds.some((id) => !Number.isFinite(scores[id]))) {
      return { success: false, message: 'Enter a valid game score for each player, or report the outcome without a score.' };
    }
  }

  if(input.finishOrder){const positions=input.finishOrder.filter(Boolean);if(input.finishOrder.length>seatedIds.length||new Set(positions).size!==positions.length||positions.some(id=>!seatedIds.includes(id)))return {success:false,message:'Use distinct finishing positions for selected players.'};}
  const decision = matchOutcome(rows, input.games, Boolean(input.draw), input.winnerIds || []);
  if (!decision.draw && decision.winners.size === 0) return { success: false, message: 'Pick a winner, or mark a draw.' };

  const patches = rows.map((seat) => {
    if (!seat.profile_id) return seat;
    let result: Result = 'loss';
    if (decision.draw) result = 'draw';
    else if (decision.winners.has(seat.profile_id)) result = 'win';
    const patch: Record<string, unknown> = { ...seat, result };
    patch.games_won = decision.games && seat.profile_id ? (decision.games[seat.profile_id] ?? 0) : null;
    if (input.decks && Object.prototype.hasOwnProperty.call(input.decks, seat.profile_id)) {
      patch.deck_id = input.decks[seat.profile_id] || null;
    }
    if (input.finishOrder) {
      const place = input.finishOrder.indexOf(seat.profile_id);
      patch.finish_order = place >= 0 ? place + 1 : null;
    }
    return patch;
  });
  const {data:savedCount,error:resultError}=await supabase.rpc('commit_weekend_result',{p_match:match.id,p_expected:input.expected||rows.map(s=>({profileId:s.profile_id,result:s.result,gamesWon:s.games_won})),p_rows:patches});
  if(resultError||savedCount!==rows.length)return {success:false,message:resultError?.message||'Result not saved. Your selection is still here; try again.'};

  let extra: string | null = null;
  if (match.tournament_id) {
    const tournament = await tournamentOf(supabase, match.tournament_id);
    const finished = Boolean(tournament?.status === 'completed' && tournament.event_id);
    if (finished && tournament?.event_id) {
      await clearFinish(supabase, tournament.id, tournament.event_id);
    }
    if (!match.is_final) extra = await advanceIfReady(supabase, match.tournament_id);
    if (finished) {
      refresh(match.event_id, match.tournament_id, match.id);
      const cleared = 'Result replaced. Places are cleared. Finish the tournament again.';
      const posted = extra && !extra.includes('set rounds') ? extra : null;
      return { success: true, message: posted ? `${cleared} ${posted}` : cleared };
    }
  }

  refresh(match.event_id, match.tournament_id, match.id);
  const saved = input.draw ? 'Draw saved.' : 'Result saved.';
  return { success: true, message: extra ? `${saved} ${extra}` : saved };
}

export async function dropPlayer(tournamentId: string, participantId: string): Promise<ActionResult> {
  const operator = await session();
  const { supabase, allowed } = operator;
  if (!allowed) return { success: false, message: 'Choose your name or open the house screen first.' };
  const tournament = await tournamentOf(supabase, tournamentId);
  if (!tournament?.event_id) return { success: false, message: 'Tournament not found.' };
  const gate = await requireMember(tournament.event_id, operator);
  if (gate.error) return { success: false, message: gate.error };

  const roster = await people(supabase, tournamentId);
  const person = roster.find((row) => row.id === participantId);
  if (!person) return { success: false, message: 'Player not found.' };
  const state = await roundState(supabase, tournamentId);
  const started = state.current.some((match) => match.started_at);

  if (!started) {
    const history = await historyOf(supabase, tournamentId);
    const hasPlayed = history.some(match => match.player1 === participantId || match.player2 === participantId);
    if (!hasPlayed) await supabase.from('tournament_participants').delete().eq('id', participantId);
    else await supabase.from('tournament_participants').update({ dropped: true }).eq('id', participantId);
    if (state.current.length > 0) {
      const ids = state.current.map((match) => match.id);
      await supabase.from('match_participants').delete().in('match_id', ids);
      await supabase.from('matches').delete().in('id', ids);
      refresh(tournament.event_id, tournamentId);
      return { success: true, message: 'Player removed. Post pairings again.' };
    }
    refresh(tournament.event_id, tournamentId);
    return { success: true, message: 'Player removed.' };
  }

  const { data: openSeat } = await supabase
    .from('match_participants')
    .select('id, match_id, result')
    .eq('participant_id', participantId)
    .is('result', null)
    .limit(1)
    .maybeSingle();
  if (openSeat) {
    const { data: match } = await supabase.from('matches').select('id, started_at').eq('id', openSeat.match_id).maybeSingle();
    if (match?.started_at) {
      await supabase.from('match_participants').update({ result: 'loss' }).eq('id', openSeat.id);
      await supabase
        .from('match_participants')
        .update({ result: 'win' })
        .eq('match_id', openSeat.match_id)
        .neq('id', openSeat.id)
        .is('result', null);
      await supabase.from('matches').update({ completed_at: new Date().toISOString() }).eq('id', openSeat.match_id);
    }
  }
  await supabase.from('tournament_participants').update({ dropped: true }).eq('id', participantId);
  const extra = openSeat ? await advanceIfReady(supabase, tournamentId) : null;
  refresh(tournament.event_id, tournamentId);
  return { success: true, message: extra ? `Player dropped. ${extra}` : 'Player dropped. Their played results stay.' };
}

export async function renameTable(matchId: string, label: string): Promise<ActionResult> {
  const operator = await session();
  const { supabase, allowed } = operator;
  if (!allowed) return { success: false, message: 'Choose your name or open the house screen first.' };
  const { data: match } = await supabase.from('matches').select('id, event_id, tournament_id').eq('id', matchId).maybeSingle();
  if (!match?.event_id) return { success: false, message: 'Table not found.' };
  const gate = await requireMember(match.event_id, operator);
  if (gate.error) return { success: false, message: gate.error };
  const next = label.trim();
  if (!next) return { success: false, message: 'A table needs a name.' };
  await supabase.from('matches').update({ table_label: next }).eq('id', matchId);
  refresh(match.event_id, match.tournament_id);
  return { success: true, message: 'Table renamed.' };
}

export async function setMatchDay(matchId: string, day: string): Promise<ActionResult> {
  const operator = await session();
  const { supabase, allowed } = operator;
  if (!allowed) return { success: false, message: 'Choose your name or open the house screen first.' };
  const { data: match } = await supabase.from('matches').select('id, event_id, tournament_id, completed_at').eq('id', matchId).maybeSingle();
  if (!match?.event_id) return { success: false, message: 'Game not found.' };
  const gate = await requireMember(match.event_id, operator);
  if (gate.error) return { success: false, message: gate.error };
  if (match.completed_at) return { success: false, message: 'The day locks when the game is finished.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { success: false, message: 'Pick a day.' };
  await supabase.from('matches').update({ played_on: day }).eq('id', matchId);
  refresh(match.event_id, match.tournament_id);
  return { success: true, message: 'Day updated.' };
}

export async function deleteTournament(tournamentId: string): Promise<ActionResult> {
  const operator = await session();
  const { supabase, allowed } = operator;
  if (!allowed) return { success: false, message: 'Choose your name or open the house screen first.' };
  const tournament = await tournamentOf(supabase, tournamentId);
  if (!tournament?.event_id) return { success: false, message: 'Tournament not found.' };
  const gate = await requireMember(tournament.event_id, operator);
  if (gate.error) return { success: false, message: gate.error };
  const state = await roundState(supabase, tournamentId);
  if (state.rows.length > 0 || tournament.status === 'active' || tournament.status === 'completed') {
    return { success: false, message: 'A tournament with pairings stays. Clear unstarted pairings, or finish it.' };
  }
  await supabase.from('tournament_participants').delete().eq('tournament_id', tournamentId);
  await supabase.from('tournaments').delete().eq('id', tournamentId);
  refresh(tournament.event_id);
  return { success: true, message: 'Tournament deleted.' };
}

export async function addFinal(tournamentId: string, order?: string[]): Promise<ActionResult> {
  const operator = await session();
  const { supabase, allowed } = operator;
  if (!allowed) return { success: false, message: 'Choose your name or open the house screen first.' };
  const tournament = await tournamentOf(supabase, tournamentId);
  if (!tournament?.event_id) return { success: false, message: 'Tournament not found.' };
  const gate = await requireMember(tournament.event_id, operator);
  if (gate.error) return { success: false, message: gate.error };
  if (tournament.status === 'completed') return { success: false, message: 'Finish already happened.' };
  const { data: existing } = await supabase
    .from('matches')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('is_final', true)
    .limit(1);
  if (existing && existing.length > 0) return { success: false, message: 'The final is already posted.' };

  const roster = (await people(supabase, tournamentId)).filter((person) => person.profile_id);
  const history = await historyOf(supabase, tournamentId);
  const ranked = rankPlayers(roster.map((person) => person.id), history);
  if (ranked.length < 2) return { success: false, message: 'The final needs two players.' };
  const ties = manualTieGroups(ranked, history).filter(group => group.includes(ranked[0].id) || group.includes(ranked[1].id));
  const ordered = orderTiedPlaces(ranked, ties, order);
  if (!ordered) return { success: false, message: 'Review the tied names in order before adding the final.', needsOrder: ties };
  const state = await roundState(supabase, tournamentId);
  if (!state.current.length || (await openTables(supabase, state.current.map(match => match.id))).length) {
    return { success: false, message: 'Record the current round results before adding the final.' };
  }
  const first = roster.find((person) => person.id === ordered[0].id);
  const second = roster.find((person) => person.id === ordered[1].id);
  if (!first || !second) return { success: false, message: 'Could not find the top two.' };

  const { data: match, error } = await supabase
    .from('matches')
    .insert({
      tournament_id: tournamentId,
      event_id: tournament.event_id,
      round_number: null,
      game_type: tournament.format,
      table_number: 1,
      table_label: 'Final',
      is_final: true,
      is_rematch: false,
      started_at: new Date().toISOString(),
      played_on: chicagoToday(),
    })
    .select('id')
    .single();
  if (error || !match) return { success: false, message: error?.message || 'Could not add the final.' };
  await supabase.from('match_participants').insert([
    { match_id: match.id, profile_id: first.profile_id, participant_id: first.id, result: null },
    { match_id: match.id, profile_id: second.profile_id, participant_id: second.id, result: null },
  ]);
  refresh(tournament.event_id, tournamentId);
  return { success: true, message: 'Final added.' };
}

export async function finishTournament(input: {
  tournamentId: string;
  order?: string[];
}): Promise<ActionResult> {
  const operator = await session();
  const { supabase, allowed } = operator;
  if (!allowed) return { success: false, message: 'Choose your name or open the house screen first.' };
  const tournament = await tournamentOf(supabase, input.tournamentId);
  if (!tournament?.event_id) return { success: false, message: 'Tournament not found.' };
  const gate = await requireMember(tournament.event_id, operator);
  if (gate.error) return { success: false, message: gate.error };
  if (!tournament.field_locked && tournament.status !== 'active') {
    return { success: false, message: 'Start the tournament before finishing it.' };
  }

  const state = await roundState(supabase, input.tournamentId);
  if (state.current.some((match) => match.started_at)) {
    const open = await openTables(supabase, state.current.filter((match) => match.started_at).map((match) => match.id));
    if (open.length > 0) return { success: false, message: `Still open: ${open.join(', ')}.` };
  }

  const roster = (await people(supabase, input.tournamentId)).filter((person) => person.profile_id);
  const history = await historyOf(supabase, input.tournamentId);
  let ranked = rankPlayers(roster.map((person) => person.id), history);
  const ties = manualTieGroups(ranked, history);
  if (ties.length > 0) {
    const order = input.order || [];
    for (const group of ties) {
      const chosen = order.filter((id) => group.includes(id));
      if (chosen.length !== group.length || new Set(chosen).size !== group.length) return { success: false, message: 'Put the tied names in order.', needsOrder: ties };
      const start = ranked.findIndex((player) => player.id === group[0]);
      const moved = chosen.map((id) => ranked.find((player) => player.id === id)!);
      ranked = [...ranked.slice(0, start), ...moved, ...ranked.slice(start + group.length)];
    }
  }

  const { data: finals } = await supabase
    .from('matches')
    .select('id')
    .eq('tournament_id', input.tournamentId)
    .eq('is_final', true)
    .limit(1);
  const finalId = finals?.[0]?.id;
  if (finalId) {
    const { data: finalists, error: finalError } = await supabase
      .from('match_participants')
      .select('participant_id, result')
      .eq('match_id', finalId);
    if (finalError) return { success: false, message: 'Could not check the final. Try again.' };
    if (!finalHasWinner((finalists || []).map(seat => seat.result as Result | null))) {
      return { success: false, message: 'Report a winner for the final before finishing.' };
    }
    const winner = (finalists || []).find((seat) => seat.result === 'win');
    const loser = (finalists || []).find((seat) => seat.result === 'loss');
    if (winner?.participant_id && loser?.participant_id) {
      ranked = finalPlaces(ranked,winner.participant_id,loser.participant_id);
    }
  }

  // An early Finish ends play; automatically posted future tables are not live games.
  // Keep every started match and its results, discarding only unstarted pairings.
  const unstartedIds = state.current.filter(match => !match.started_at).map(match => match.id);
  if (unstartedIds.length) {
    const { error: seatsError } = await supabase.from('match_participants').delete().in('match_id', unstartedIds);
    if (seatsError) return { success: false, message: 'Could not clear the unstarted tables. Try finishing again.' };
    const { error: matchesError } = await supabase.from('matches').delete().in('id', unstartedIds).is('started_at', null);
    if (matchesError) return { success: false, message: 'Could not clear the unstarted tables. Try finishing again.' };
  }
  for (let index = 0; index < ranked.length; index += 1) {
    const { data, error } = await supabase.from('tournament_participants').update({ place: index + 1 }).eq('id', ranked[index].id).select('id');
    if (error || data?.length !== 1) return { success: false, message: 'Could not save all places. Review them and finish again.' };
  }

  const { data: finished, error: finishError } = await supabase.from('tournaments').update({ status: 'completed', finished_at: new Date().toISOString() }).eq('id', input.tournamentId).select('id');
  if (finishError || finished?.length !== 1) return { success: false, message: 'Could not finish the tournament. Try again.' };
  refresh(tournament.event_id, input.tournamentId);
  return { success: true, message: 'Finished. 1st, 2nd, and 3rd are labeled.' };
}

export async function deleteQuickMatch(matchId: string): Promise<ActionResult> {
  const operator = await session();
  const { supabase, allowed } = operator;
  if (!allowed) return { success: false, message: 'Choose your name or open the house screen first.' };
  const { data: match } = await supabase
    .from('matches')
    .select('id, event_id, tournament_id')
    .eq('id', matchId)
    .maybeSingle();
  if (!match?.event_id || match.tournament_id) return { success: false, message: 'That is not a quick match.' };
  const gate = await requireMember(match.event_id, operator);
  if (gate.error) return { success: false, message: gate.error };
  const { data: seats } = await supabase.from('match_participants').select('result').eq('match_id', matchId);
  if ((seats || []).some((seat) => seat.result)) return { success: false, message: 'A reported game stays. Replace the result instead.' };
  await supabase.from('match_participants').delete().eq('match_id', matchId);
  await supabase.from('matches').delete().eq('id', matchId);
  refresh(match.event_id, null, matchId);
  return { success: true, message: 'Game deleted.' };
}

export async function saveQuickMatch(input: {
  eventId: string;
  matchId?: string;
  requestId?: string;
  format: string;
  customName?: string;
  profileIds: string[];
  teams?: Record<string, number>;
  deckIds?: Record<string, string>;
  winnerIds?: string[];
  draw?: boolean;
  playedOn?: string;
  finishOrder?: string[];
}): Promise<ActionResult & { matchId?: string }> {
  const gate = await requireMember(input.eventId);
  if (gate.error) return { success: false, message: gate.error || 'Sign in first.' };
  const format = quickFormat(input.format);
  const players = [...new Set(input.profileIds)];
  if (players.length < format.min || players.length > format.max) {
    return { success: false, message: `${format.label} uses ${format.min === format.max ? format.min : `${format.min} to ${format.max}`} players.` };
  }
  if (format.id === 'two_headed_giant') {
    const teams = input.teams || {};
    const sides = [1, 2].map((side) => players.filter((id) => Number(teams[id]) === side).length);
    if (sides[0] !== 2 || sides[1] !== 2) return { success: false, message: 'Two-Headed Giant is two teams of two.' };
  }

  const hasResult = Boolean(input.draw) || (input.winnerIds || []).length > 0;
  const day = input.playedOn || chicagoToday();
  if (!input.matchId && input.requestId) {
    const {data,error}=await gate.supabase.rpc('create_weekend_quick',{p_event:input.eventId,p_request:input.requestId,p_values:{...input,format:format.id,label:input.customName?.trim()||format.label,playedOn:day}});
    if(error||!data)return {success:false,message:error?.message||'Could not save the game.'};
    refresh(input.eventId,null,data);return {success:true,matchId:data,message:hasResult?'Result saved.':'Game started.'};
  }
  let matchId = input.matchId;

  if (matchId) {
    const { data: existing } = await gate.supabase
      .from('matches')
      .select('id, tournament_id, completed_at')
      .eq('event_id', input.eventId)
      .eq('id', matchId)
      .maybeSingle();
    if (!existing || existing.tournament_id) return { success: false, message: 'Game not found.' };
    if (existing.completed_at && !hasResult) return { success: false, message: 'Replace the result. The game stays.' };
    await gate.supabase.from('match_participants').delete().eq('match_id', matchId);
    const patch: Record<string, string | null> = {
      game_type: format.id,
      format_label: input.customName?.trim() || format.label,
      completed_at: hasResult ? new Date().toISOString() : null,
    };
    if (!existing.completed_at) patch.played_on = day;
    await gate.supabase.from('matches').update(patch).eq('id', matchId);
  } else {
    const { data: match, error } = await gate.supabase
      .from('matches')
      .insert({
        event_id: input.eventId,
        tournament_id: null,
        game_type: format.id,
        format_label: input.customName?.trim() || format.label,
        played_on: day,
        started_at: new Date().toISOString(),
        completed_at: hasResult ? new Date().toISOString() : null,
        table_label: input.customName?.trim() || format.label,
        round_number: null,
      })
      .select('id')
      .single();
    if (error || !match) return { success: false, message: error?.message || 'Could not start the game.' };
    matchId = match.id;
  }

  const winners = new Set(input.winnerIds || []);
  const rows = players.map((profileId) => {
    let result: Result | null = null;
    if (input.draw) result = 'draw';
    else if (hasResult) result = winners.has(profileId) ? 'win' : 'loss';
    const order = input.finishOrder?.indexOf(profileId) ?? -1;
    return {
      match_id: matchId,
      profile_id: profileId,
      result,
      deck_id: input.deckIds?.[profileId] || null,
      team: input.teams?.[profileId] || null,
      finish_order: order >= 0 ? order + 1 : null,
      games_won: null,
    };
  });
  const { error: seatError } = await gate.supabase.from('match_participants').insert(rows);
  if (seatError) return { success: false, message: seatError.message };
  refresh(input.eventId, null, matchId);
  return { success: true, matchId, message: hasResult ? 'Result saved.' : 'Game started.' };
}

export async function setPlayName(playName: string): Promise<ActionResult> {
  const operator = await session();
  const { supabase, user } = operator;
  if (!user) return { success: false, message: 'Choose your name first.' };
  const name = playName.trim();
  if (name.length < 1 || name.length > 40) return { success: false, message: 'Use a play name.' };
  const { error } = await supabase.from('profiles').update({
    display_name: name,
    updated_at: new Date().toISOString(),
  }).eq('id', user.id);
  if (error) return { success: false, message: error.message };
  revalidatePath('/', 'layout');
  return { success: true, message: 'Play name saved.' };
}

export async function currentMatchResult(matchId:string){const ctx=await resolvePlayer();const {data:m}=await ctx.supabase.from('matches').select('event_id').eq('id',matchId).maybeSingle();if(!m?.event_id)return null;const gate=await requireMember(m.event_id);if(gate.error)return null;const {data,error}=await ctx.supabase.from('match_participants').select('profile_id,result,games_won').eq('match_id',matchId);if(error)return null;return (data||[]).map(s=>({profileId:String(s.profile_id),result:s.result as string|null,gamesWon:s.games_won as number|null}));}
