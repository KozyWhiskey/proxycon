'use server';

import { createClient } from '@/utils/supabase/server';
import { resolvePlayer } from '@/lib/player-session';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  generateSwissPairings,
  convertDbMatchToMatchResult,
  calculateStandings,
  sortStandings,
  BYE_GAMES_WON,
  type MatchResult,
} from '@/lib/swiss-pairing';
import { randomBytes } from 'crypto';
import { TimerData, TimerControlResult } from '@/lib/types';
import { isPodFormat, needsSeating, cardSourceFor, rosterKey, matchPlayerKey } from '@/lib/activity';
import { fetchBudgetDeck } from '@/lib/budget-deck';
import { checkAndAwardBadges, awardBadge, checkAndAwardCommanderBadge, checkAndAwardSetBadge, checkAndAwardMatchFeats } from '@/lib/badges';

function makeCode() {
  return randomBytes(3).toString('hex').toUpperCase();
}

async function setPlayerResult(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string,
  playerKey: string,
  patch: { result: string; games_won?: number; deck_id?: string | null }
) {
  const { data: rows } = await supabase
    .from('match_participants')
    .select('id, profile_id, participant_id')
    .eq('match_id', matchId);
  const row = (rows || []).find((entry) => entry.profile_id === playerKey || entry.participant_id === playerKey);
  if (!row) return;
  await supabase.from('match_participants').update(patch).eq('id', row.id);
}

async function insertRoundMatches(
  supabase: Awaited<ReturnType<typeof createClient>>,
  args: {
    tournamentId: string;
    eventId: string | null;
    roundNumber: number;
    gameType: string;
    pairings: Array<{ player1: string; player2?: string | null }>;
  }
) {
  const { data: people } = await supabase
    .from('tournament_participants')
    .select('id, profile_id, draft_seat')
    .eq('tournament_id', args.tournamentId);
  const findPerson = (key: string) => (people || []).find((person) => person.id === key || person.profile_id === key);

  let table = 1;
  for (const pairing of args.pairings) {
    const first = findPerson(pairing.player1);
    const second = pairing.player2 ? findPerson(pairing.player2) : null;
    if (!first || (pairing.player2 && !second)) continue;

    const { data: match, error } = await supabase.from('matches').insert({
      tournament_id: args.tournamentId,
      event_id: args.eventId,
      round_number: args.roundNumber,
      game_type: args.gameType,
      table_number: table,
      join_code: makeCode(),
    }).select().single();
    table += 1;
    if (error || !match) {
      console.error('Error creating match:', error);
      continue;
    }
    if (!second) {
      await supabase.from('match_participants').insert({
        match_id: match.id,
        profile_id: first.profile_id,
        participant_id: first.id,
        seat_number: first.draft_seat,
        result: 'win',
        games_won: BYE_GAMES_WON,
      });
    } else {
      await supabase.from('match_participants').insert([
        { match_id: match.id, profile_id: first.profile_id, participant_id: first.id, seat_number: first.draft_seat, result: null },
        { match_id: match.id, profile_id: second.profile_id, participant_id: second.id, seat_number: second.draft_seat, result: null },
      ]);
    }
  }
}

interface CreateTournamentResult {
  success: boolean;
  message?: string;
  tournamentId?: string;
}

export async function createTournament(input: {
  name: string;
  playerIds: string[];
  format?: string;
  maxRounds?: number;
  roundDurationMinutes?: number;
  eventId?: string;
  setCode?: string;
  setName?: string;
  setCodes?: string[];
  cubeList?: string;
  startsOn?: string;
  openSeats?: number;
  rosterIds?: string[];
  planned?: boolean;
  productNote?: string;
  bringingProduct?: boolean;
}): Promise<CreateTournamentResult> {
  try {
    const name = input.name;
    const format = input.format || 'set_draft';
    const maxRounds = input.maxRounds ?? 3;
    const roundDurationMinutes = input.roundDurationMinutes ?? 50;
    const pod = isPodFormat(format);

    if (!name || name.trim().length === 0) return { success: false, message: 'Name is required' };
    if (!pod && (maxRounds < 1 || maxRounds > 10)) return { success: false, message: 'Rounds must be 1-10' };
    if (roundDurationMinutes < 1) return { success: false, message: 'Round duration must be positive' };

    const ctx = await resolvePlayer();
    if (!ctx.authUser) return { success: false, message: 'Not authenticated' };
    const supabase = ctx.supabase;
    const actorId = ctx.playerId;

    const playerIds = Array.from(new Set(input.playerIds));
    const source = cardSourceFor(format);
    const setCodes = source === 'sets'
      ? (input.setCodes || [])
      : source === 'set' && input.setCode
        ? [input.setCode]
        : input.setCodes || null;

    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .insert({
        name: name.trim(),
        format,
        status: input.planned ? 'pending' : pod ? 'active' : 'pending',
        max_rounds: pod ? 1 : maxRounds,
        round_duration_minutes: roundDurationMinutes,
        event_id: input.eventId || null,
        set_code: input.setCode || setCodes?.[0] || null,
        set_name: input.setName || null,
        set_codes: setCodes,
        cube_list: input.cubeList || null,
        card_source: source,
        starts_on: input.startsOn || null,
        invite_code: makeCode(),
        singleton: format === 'cube',
        planned: Boolean(input.planned),
        brought_by: input.bringingProduct && actorId ? actorId : null,
        abdicated: input.bringingProduct === false,
        product_note: input.productNote || null,
      })
      .select()
      .single();

    if (tournamentError || !tournament) return { success: false, message: tournamentError?.message || 'Failed' };

    if (!input.planned) {
      const roster = input.rosterIds?.length ? input.rosterIds : playerIds;
      const seatCount = input.openSeats && input.openSeats > 0 ? Math.max(input.openSeats, roster.length) : 0;
      if (seatCount > 0) {
        for (let index = 0; index < seatCount; index += 1) {
          const { error: pError } = await supabase.from('tournament_participants').insert({
            tournament_id: tournament.id,
            profile_id: roster[index] || null,
            draft_seat: index + 1,
            dropped: false,
          });
          if (pError) return { success: false, message: pError.message };
        }
      } else {
        for (const profileId of roster) {
          const { error: pError } = await supabase.from('tournament_participants').insert({
            tournament_id: tournament.id,
            profile_id: profileId,
            draft_seat: null,
            dropped: false,
          });
          if (pError) return { success: false, message: pError.message };
        }
      }
    }

    if (input.planned && input.eventId) redirect(`/events/${input.eventId}`);
    if (pod) redirect(`/tournament/${tournament.id}/pods`);
    if (needsSeating(format)) redirect(`/tournament/${tournament.id}/seating`);
    redirect(`/tournament/${tournament.id}`);
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error && (error as any).digest?.startsWith('NEXT_REDIRECT')) throw error;
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

interface SubmitResultResult {
  success: boolean;
  message?: string;
  nextRoundGenerated?: boolean;
  awardedBadges?: any[];
}

export async function submitResultWithGames(
  matchId: string,
  player1Id: string,
  player1Games: number,
  player1DeckId: string | null,
  player2Id: string,
  player2Games: number,
  player2DeckId: string | null,
  tournamentId: string
): Promise<SubmitResultResult> {
  try {
    const supabase = await createClient();
    
    let p1Result = 'loss', p2Result = 'loss';
    if (player1Games > player2Games) { p1Result = 'win'; p2Result = 'loss'; }
    else if (player2Games > player1Games) { p1Result = 'loss'; p2Result = 'win'; }
    else { p1Result = 'draw'; p2Result = 'draw'; }

    await setPlayerResult(supabase, matchId, player1Id, { result: p1Result, games_won: player1Games, deck_id: player1DeckId });
    await setPlayerResult(supabase, matchId, player2Id, { result: p2Result, games_won: player2Games, deck_id: player2DeckId });

    const nextRoundGenerated = await checkAndGenerateNextRound(supabase, matchId, tournamentId);
    try {
      await awardResultBadges(supabase, {
        matchId, tournamentId, player1Id, player1Games, player1DeckId, player2Id, player2Games, player2DeckId,
      });
    } catch (badgeError) {
      console.error('Badge award failed after result:', badgeError);
    }
    revalidatePath(`/tournament/${tournamentId}`);
    revalidatePath('/stats');
    redirect(`/tournament/${tournamentId}${nextRoundGenerated ? '?roundGenerated=true' : ''}`);
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error && (error as any).digest?.startsWith('NEXT_REDIRECT')) throw error;
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function submitDraw(matchId: string, playerIds: string[], tournamentId: string): Promise<SubmitResultResult> {
   try {
    const supabase = await createClient();
    for (const playerId of playerIds) {
      await setPlayerResult(supabase, matchId, playerId, { result: 'draw' });
    }
    
    const nextRoundGenerated = await checkAndGenerateNextRound(supabase, matchId, tournamentId);
    revalidatePath(`/tournament/${tournamentId}`);
    revalidatePath('/stats');
    redirect(`/tournament/${tournamentId}${nextRoundGenerated ? '?roundGenerated=true' : ''}`);
   } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error && (error as any).digest?.startsWith('NEXT_REDIRECT')) throw error;
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
   }
}

async function checkAndGenerateNextRound(supabase: any, matchId: string, tournamentId: string) {
  const { data: match } = await supabase.from('matches').select('round_number').eq('id', matchId).single();
  if (!match) return false;

  const { data: roundMatches } = await supabase.from('matches').select('id').eq('tournament_id', tournamentId).eq('round_number', match.round_number);
  if (!roundMatches) return false;

  const matchIds = roundMatches.map((m: any) => m.id);
  const { data: participants } = await supabase.from('match_participants').select('match_id, result').in('match_id', matchIds);

  const map = new Map();
  participants?.forEach((p: any) => {
    if (!map.has(p.match_id)) map.set(p.match_id, { total: 0, done: 0 });
    const d = map.get(p.match_id);
    d.total++;
    if (p.result) d.done++;
  });

  const allComplete = roundMatches.every((m: any) => {
    const d = map.get(m.id);
    return d && d.total > 0 && d.total === d.done;
  });

  if (allComplete) {
    await generateNextRound(tournamentId, match.round_number);
    return true;
  }
  return false;
}

export async function generateNextRound(tournamentId: string, currentRound: number) {
  const supabase = await createClient();
  const { data: tournament } = await supabase.from('tournaments').select('format, max_rounds, event_id, set_code, set_name').eq('id', tournamentId).single();
  
  const { data: tps } = await supabase.from('tournament_participants').select('id, profile_id, dropped').eq('tournament_id', tournamentId);
  const profileIds = (tps || []).filter(p => !p.dropped).map(p => rosterKey(p));

  const { data: matches } = await supabase.from('matches').select('id, round_number').eq('tournament_id', tournamentId).lte('round_number', currentRound);
  const matchIds = matches?.map(m => m.id) || [];
  const { data: mps } = await supabase.from('match_participants').select('match_id, profile_id, participant_id, result, games_won').in('match_id', matchIds);

  const history: MatchResult[] = [];
  matches?.forEach(m => {
    const p = mps?.filter((mp: any) => mp.match_id === m.id);
    if (p && p.length > 0) {
      history.push(convertDbMatchToMatchResult(m.id, m.round_number, p.map((x: any) => ({ playerId: matchPlayerKey(x), result: x.result, gamesWon: x.games_won || 0 }))));
    }
  });

  if (currentRound >= (tournament?.max_rounds || 3)) {
    await supabase.from('tournaments').update({ status: 'completed' }).eq('id', tournamentId);
    
    // Award 'Champion' badge to the winner
    try {
      const standingsMap = calculateStandings(profileIds, history);
      const sortedStandings = sortStandings(Array.from(standingsMap.values()));
      
      if (sortedStandings.length > 0) {
        const winnerRow = (tps || []).find((row) => rosterKey(row) === sortedStandings[0].playerId);
        const winnerProfile = winnerRow?.profile_id;
        if (winnerProfile) await awardBadge(supabase, winnerProfile, 'champion', tournament?.event_id || null);

        // Award Set Badges (Tiered)
        if (tournament?.format === 'draft' || tournament?.format === 'sealed' || tournament?.format === 'set_draft') {
            if (tournament?.set_code && tournament?.set_name) {
                const profileAt = (index: number) => {
                  const standing = sortedStandings[index];
                  if (!standing) return null;
                  return (tps || []).find((row) => rosterKey(row) === standing.playerId)?.profile_id || null;
                };
                const first = profileAt(0);
                const second = profileAt(1);
                const third = profileAt(2);
                if (first) await checkAndAwardSetBadge(first, tournament.set_code, tournament.set_name, tournament.event_id, 1);
                if (second) await checkAndAwardSetBadge(second, tournament.set_code, tournament.set_name, tournament.event_id, 2);
                if (third) await checkAndAwardSetBadge(third, tournament.set_code, tournament.set_name, tournament.event_id, 3);
            }
        }
      }
    } catch (e) {
      console.error('Error awarding champion badge:', e);
    }
    
    return;
  }

  const { pairings } = generateSwissPairings(profileIds, history);
  const nextRound = currentRound + 1;

  await insertRoundMatches(supabase, {
    tournamentId,
    eventId: tournament?.event_id || null,
    roundNumber: nextRound,
    gameType: tournament?.format || 'set_draft',
    pairings,
  });
}

// Helper to get timer data
async function getTimerData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
  roundNumber: number
): Promise<TimerData | null> {
  const { data: tournamentData, error: tournamentError } = await supabase
    .from('tournaments')
    .select('round_duration_minutes')
    .eq('id', tournamentId)
    .single();

  if (tournamentError || !tournamentData) {
    console.error('getTimerData: Error fetching tournament', tournamentError);
    return null;
  }

  const { data: matchData, error: matchError } = await supabase
    .from('matches')
    .select('started_at, paused_at, remaining_seconds')
    .eq('tournament_id', tournamentId)
    .eq('round_number', roundNumber)
    .limit(1)
    .maybeSingle();

  if (matchError) {
    console.error('getTimerData: Error fetching match', matchError);
    return null;
  }

  return {
    roundDurationMinutes: tournamentData.round_duration_minutes,
    startedAt: matchData?.started_at || null,
    pausedAt: matchData?.paused_at || null,
    remainingSeconds: matchData?.remaining_seconds ?? null,
  };
}

export async function startRoundTimer(
  tournamentId: string,
  roundNumber: number
): Promise<TimerControlResult> {
  try {
    const supabase = await createClient();

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('round_duration_minutes')
      .eq('id', tournamentId)
      .single();

    if (!tournament) return { success: false, message: 'Tournament not found' };

    const now = new Date().toISOString();
    const durationSeconds = tournament.round_duration_minutes * 60;
    
    await supabase
      .from('matches')
      .update({ started_at: now, paused_at: null, remaining_seconds: durationSeconds })
      .eq('tournament_id', tournamentId)
      .eq('round_number', roundNumber);

    const updatedTimerData = await getTimerData(supabase, tournamentId, roundNumber);
    return { success: true, updatedTimerData };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function pauseRoundTimer(
  tournamentId: string,
  roundNumber: number
): Promise<TimerControlResult> {
  try {
    const supabase = await createClient();
    const { data: match } = await supabase.from('matches').select('started_at, remaining_seconds').eq('tournament_id', tournamentId).eq('round_number', roundNumber).single();

    if (!match?.started_at) return { success: false, message: 'Timer not started' };
    
    const now = new Date();
    const start = new Date(match.started_at);
    const elapsedSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
    const newRemainingSeconds = Math.max(0, (match.remaining_seconds || 0) - elapsedSeconds);

    await supabase.from('matches').update({ paused_at: now.toISOString(), remaining_seconds: newRemainingSeconds }).eq('tournament_id', tournamentId).eq('round_number', roundNumber);
    
    const updatedTimerData = await getTimerData(supabase, tournamentId, roundNumber);
    return { success: true, updatedTimerData };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function resumeRoundTimer(
  tournamentId: string,
  roundNumber: number
): Promise<TimerControlResult> {
  try {
    const supabase = await createClient();
    const { data: match } = await supabase.from('matches').select('started_at, paused_at, remaining_seconds').eq('tournament_id', tournamentId).eq('round_number', roundNumber).single();

    if (!match?.started_at || !match.paused_at) return { success: false, message: 'Timer not paused' };

    await supabase.from('matches').update({ started_at: new Date().toISOString(), paused_at: null }).eq('tournament_id', tournamentId).eq('round_number', roundNumber);
    
    const updatedTimerData = await getTimerData(supabase, tournamentId, roundNumber);
    return { success: true, updatedTimerData };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function updateRoundDuration(
  tournamentId: string,
  newDurationMinutes: number
): Promise<TimerControlResult> {
  try {
    const supabase = await createClient();

    if (newDurationMinutes < 1 || newDurationMinutes > 300) {
      return { success: false, message: 'Duration must be between 1 and 300 minutes' };
    }

    const { error: tournamentError } = await supabase
      .from('tournaments')
      .update({ round_duration_minutes: newDurationMinutes })
      .eq('id', tournamentId);

    if (tournamentError) return { success: false, message: tournamentError.message };

    const { data: activeRoundData } = await supabase
      .from('matches')
      .select('round_number')
      .eq('tournament_id', tournamentId)
      .order('round_number', { ascending: false })
      .limit(1)
      .single();

    if (!activeRoundData) {
      return { success: true, updatedTimerData: { roundDurationMinutes: newDurationMinutes, startedAt: null, pausedAt: null, remainingSeconds: null } };
    }
    const currentRound = activeRoundData.round_number;

    await supabase
      .from('matches')
      .update({ started_at: null, paused_at: null, remaining_seconds: null })
      .eq('tournament_id', tournamentId)
      .eq('round_number', currentRound);
    
    const updatedTimerData = await getTimerData(supabase, tournamentId, currentRound);
    return { success: true, updatedTimerData };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function submitResultWithGamesNoRedirect(
  matchId: string,
  player1Id: string,
  player1Games: number,
  player1DeckId: string | null,
  player2Id: string,
  player2Games: number,
  player2DeckId: string | null,
  tournamentId: string
): Promise<SubmitResultResult> {
  try {
    const supabase = await createClient();
    
    let p1Result = 'loss', p2Result = 'loss';

    if (player1Games > player2Games) {
      p1Result = 'win';
      p2Result = 'loss';
    }
    else if (player2Games > player1Games) {
      p1Result = 'loss';
      p2Result = 'win';
    }
    else { p1Result = 'draw'; p2Result = 'draw'; }

    await setPlayerResult(supabase, matchId, player1Id, { result: p1Result, games_won: player1Games, deck_id: player1DeckId });
    await setPlayerResult(supabase, matchId, player2Id, { result: p2Result, games_won: player2Games, deck_id: player2DeckId });

    const nextRoundGenerated = await checkAndGenerateNextRound(supabase, matchId, tournamentId);
    let awardedBadges: any[] = [];
    try {
      awardedBadges = await awardResultBadges(supabase, {
        matchId, tournamentId, player1Id, player1Games, player1DeckId, player2Id, player2Games, player2DeckId,
      });
    } catch (badgeError) {
      console.error('Badge award failed after result:', badgeError);
    }

    revalidatePath(`/tournament/${tournamentId}`);
    revalidatePath(`/tournament/${tournamentId}/dashboard`);
    revalidatePath('/stats');

    return { success: true, nextRoundGenerated, awardedBadges };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function awardResultBadges(
  supabase: Awaited<ReturnType<typeof createClient>>,
  args: {
    matchId: string;
    tournamentId: string;
    player1Id: string;
    player1Games: number;
    player1DeckId: string | null;
    player2Id: string;
    player2Games: number;
    player2DeckId: string | null;
  }
) {
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('event_id, format, set_code, set_name')
    .eq('id', args.tournamentId)
    .single();
  if (!tournament) return [];

  const [b1, b2] = await Promise.all([
    checkAndAwardBadges(args.player1Id, tournament.event_id),
    checkAndAwardBadges(args.player2Id, tournament.event_id),
  ]);
  const awarded: any[] = [...b1, ...b2];

  let winnerId: string | null = null;
  let winnerDeckId: string | null = null;
  if (args.player1Games > args.player2Games) {
    winnerId = args.player1Id;
    winnerDeckId = args.player1DeckId;
  } else if (args.player2Games > args.player1Games) {
    winnerId = args.player2Id;
    winnerDeckId = args.player2DeckId;
  }

  const limited = tournament.format === 'draft' || tournament.format === 'set_draft' || tournament.format === 'chaos_draft' || tournament.format === 'cube' || tournament.format === 'sealed';
  if (winnerId && !limited && winnerDeckId) {
    const aiBadge = await checkAndAwardCommanderBadge(winnerId, winnerDeckId, tournament.event_id);
    if (aiBadge) awarded.push(aiBadge);
  }
  if (winnerId) {
    const loserId = winnerId === args.player1Id ? args.player2Id : args.player1Id;
    const feat = await checkAndAwardMatchFeats(args.matchId, winnerId, loserId);
    if (feat) awarded.push(feat);
  }
  return awarded;
}

export async function randomizeSeating(tournamentId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient();

    const { data: participants } = await supabase.from('tournament_participants').select('id, profile_id').eq('tournament_id', tournamentId);
    if (!participants || participants.length === 0) return { success: false, message: 'No participants to seat' };

    const shuffled = [...participants].sort(() => Math.random() - 0.5);

    await supabase.from('tournament_participants').update({ draft_seat: null }).eq('tournament_id', tournamentId);

    for (let i = 0; i < shuffled.length; i++) {
      await supabase.from('tournament_participants').update({ draft_seat: i + 1 }).eq('id', shuffled[i].id);
    }

    revalidatePath(`/tournament/${tournamentId}/seating`);
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function selectSeat(
  tournamentId: string,
  profileId: string, // Changed from playerId to profileId
  seatNumber: number | null
): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient();

    if (seatNumber === null) {
      await supabase.from('tournament_participants').update({ draft_seat: null }).eq('tournament_id', tournamentId).eq('profile_id', profileId);
    } else {
      const { data: numParticipants } = await supabase.from('tournament_participants').select('id').eq('tournament_id', tournamentId);
      const totalPlayers = numParticipants?.length || 0;
      if (seatNumber < 1 || seatNumber > totalPlayers) return { success: false, message: `Seat must be between 1 and ${totalPlayers}` };

      const { data: existingSeatHolder } = await supabase.from('tournament_participants').select('id, profile_id').eq('tournament_id', tournamentId).eq('draft_seat', seatNumber).maybeSingle();

      if (existingSeatHolder && existingSeatHolder.profile_id !== profileId) {
        await supabase.from('tournament_participants').update({ draft_seat: null }).eq('id', existingSeatHolder.id);
      }

      await supabase.from('tournament_participants').update({ draft_seat: null }).eq('tournament_id', tournamentId).eq('profile_id', profileId);
      await supabase.from('tournament_participants').update({ draft_seat: seatNumber }).eq('tournament_id', tournamentId).eq('profile_id', profileId);
    }
    revalidatePath(`/tournament/${tournamentId}/seating`);
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function startDraft(tournamentId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient();

    const { data: existingMatches } = await supabase.from('matches').select('id').eq('tournament_id', tournamentId).limit(1);
    if (existingMatches && existingMatches.length > 0) return { success: false, message: 'Draft has already started' };

    const { data: tournament } = await supabase.from('tournaments').select('id, format, event_id').eq('id', tournamentId).single();
    if (!tournament) return { success: false, message: 'Tournament not found' };

    const { data: participants } = await supabase
      .from('tournament_participants')
      .select('id, profile_id, draft_seat, dropped')
      .eq('tournament_id', tournamentId)
      .order('draft_seat', { ascending: true });

    const activePlayers = (participants || []).filter(p => !p.dropped);
    if (activePlayers.length < 2) return { success: false, message: 'Not enough participants' };
    if (activePlayers.some(p => p.draft_seat === null)) return { success: false, message: 'All players must select their seats' };

    const numPlayers = activePlayers.length;
    const pairings: Array<{ player1: string; player2?: string }> = [];

    for (let i = 0; i < Math.floor(numPlayers / 2); i++) {
      const seat1 = i + 1;
      const seat2 = i + 1 + Math.floor(numPlayers / 2);
      
      const p1 = activePlayers.find((p) => p.draft_seat === seat1);
      const p2 = activePlayers.find((p) => p.draft_seat === seat2);
      
      if (p1 && p2) {
        pairings.push({ player1: rosterKey(p1), player2: rosterKey(p2) });
      }
    }

    if (numPlayers % 2 === 1) {
      const byePlayer = activePlayers.find((p) => p.draft_seat === numPlayers);
      if (byePlayer) pairings.push({ player1: rosterKey(byePlayer) });
    }

    await supabase.from('tournaments').update({ status: 'active' }).eq('id', tournamentId);
    await insertRoundMatches(supabase, {
      tournamentId,
      eventId: tournament.event_id,
      roundNumber: 1,
      gameType: tournament.format,
      pairings,
    });

    revalidatePath(`/tournament/${tournamentId}`);
    redirect(`/tournament/${tournamentId}`);
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error && (error as any).digest?.startsWith('NEXT_REDIRECT')) throw error;
    return { success: false, message: error instanceof Error ? error.message : 'Error' };
  }
}

export async function forceStartRound1(tournamentId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient();

    // Check if matches already exist
    const { data: existingMatches } = await supabase.from('matches').select('id').eq('tournament_id', tournamentId).limit(1);
    if (existingMatches && existingMatches.length > 0) return { success: false, message: 'Matches already exist for this tournament.' };

    const { data: tournament } = await supabase.from('tournaments').select('id, format, event_id').eq('id', tournamentId).single();
    if (!tournament) return { success: false, message: 'Tournament not found' };

    // Reuse startDraft logic essentially
    const { data: participants } = await supabase
      .from('tournament_participants')
      .select('id, profile_id, draft_seat, dropped')
      .eq('tournament_id', tournamentId)
      .order('draft_seat', { ascending: true });

    const seated = (participants || []).filter(p => !p.dropped);
    if (seated.length < 2) return { success: false, message: 'Not enough participants' };
    
    // If seats aren't assigned, we can't do seat-based pairing. Fallback to random?
    // Ideally user goes back to seating page.
    if (seated.some(p => p.draft_seat === null)) return { success: false, message: 'Draft seats not assigned. Go back to seating.' };

    const numPlayers = seated.length;
    const pairings: Array<{ player1: string; player2?: string }> = [];

    for (let i = 0; i < Math.floor(numPlayers / 2); i++) {
      const seat1 = i + 1;
      const seat2 = i + 1 + Math.floor(numPlayers / 2);
      
      const p1 = seated.find((p) => p.draft_seat === seat1);
      const p2 = seated.find((p) => p.draft_seat === seat2);
      
      if (p1 && p2) {
        pairings.push({ player1: rosterKey(p1), player2: rosterKey(p2) });
      }
    }

    if (numPlayers % 2 === 1) {
      const byePlayer = seated.find((p) => p.draft_seat === numPlayers);
      if (byePlayer) pairings.push({ player1: rosterKey(byePlayer) });
    }

    await supabase.from('tournaments').update({ status: 'active' }).eq('id', tournamentId);
    await insertRoundMatches(supabase, {
      tournamentId,
      eventId: tournament.event_id,
      roundNumber: 1,
      gameType: tournament.format,
      pairings,
    });

    revalidatePath(`/tournament/${tournamentId}`);
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteTournament(tournamentId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient();
    // Soft delete: set is_archived to true
    await supabase.from('tournaments').update({ is_archived: true }).eq('id', tournamentId);
    revalidatePath('/tournaments');
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function restoreTournament(tournamentId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient();
    await supabase.from('tournaments').update({ is_archived: false }).eq('id', tournamentId);
    revalidatePath('/tournaments');
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function permanentlyDeleteTournament(tournamentId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient();
    await supabase.from('tournaments').delete().eq('id', tournamentId);
    revalidatePath('/tournaments');
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function requireUser() {
  const ctx = await resolvePlayer();
  if (!ctx.authUser || !ctx.playerId) return { supabase: ctx.supabase, user: null };
  return { supabase: ctx.supabase, user: { ...ctx.authUser, id: ctx.playerId } };
}

export async function startRandomRound1(tournamentId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await createClient();
    const { data: existingMatches } = await supabase.from('matches').select('id').eq('tournament_id', tournamentId).limit(1);
    if (existingMatches && existingMatches.length > 0) return { success: false, message: 'Round 1 already exists' };

    const { data: tournament } = await supabase.from('tournaments').select('id, format, event_id').eq('id', tournamentId).single();
    if (!tournament) return { success: false, message: 'Sitting not found' };
    if (needsSeating(tournament.format) || isPodFormat(tournament.format)) {
      return { success: false, message: 'This sitting does not start with a random pairing' };
    }

    const { data: participants } = await supabase
      .from('tournament_participants')
      .select('id, profile_id, dropped')
      .eq('tournament_id', tournamentId);
    const ids = (participants || []).filter(p => !p.dropped).map(p => rosterKey(p));
    if (ids.length < 2) return { success: false, message: 'At least two players need to be checked in' };

    const shuffled = [...ids].sort(() => Math.random() - 0.5);
    const pairings: Array<{ player1: string; player2?: string }> = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) pairings.push({ player1: shuffled[i], player2: shuffled[i + 1] });
      else pairings.push({ player1: shuffled[i] });
    }

    await supabase.from('tournaments').update({ status: 'active' }).eq('id', tournamentId);
    await insertRoundMatches(supabase, {
      tournamentId,
      eventId: tournament.event_id,
      roundNumber: 1,
      gameType: tournament.format,
      pairings,
    });
    revalidatePath(`/tournament/${tournamentId}`);
    revalidatePath(`/events/${tournament.event_id}`);
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function joinActivity(code: string): Promise<{ success: boolean; message?: string; tournamentId?: string; href?: string }> {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return { success: false, message: 'Not authenticated' };

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, event_id, format, status, planned')
      .eq('invite_code', code.toUpperCase())
      .single();
    if (!tournament) return { success: false, message: 'That sitting code was not found' };

    if (tournament.event_id) {
      const { data: member } = await supabase
        .from('event_members')
        .select('profile_id')
        .eq('event_id', tournament.event_id)
        .eq('profile_id', user.id)
        .maybeSingle();
      if (!member) {
        await supabase.from('event_members').insert({
          event_id: tournament.event_id,
          profile_id: user.id,
          role: 'player',
        });
      }
    }

    const { data: seats } = await supabase
      .from('tournament_participants')
      .select('id, profile_id, dropped')
      .eq('tournament_id', tournament.id);
    const existing = (seats || []).find((seat) => seat.profile_id === user.id);
    const openSeat = (seats || []).some((seat) => !seat.profile_id && !seat.dropped);

    if (existing?.dropped) {
      await supabase.from('tournament_participants').update({ dropped: false }).eq('id', existing.id);
    } else if (!existing && !openSeat) {
      const { error } = await supabase.from('tournament_participants').insert({
        tournament_id: tournament.id,
        profile_id: user.id,
        draft_seat: null,
        dropped: false,
      });
      if (error) return { success: false, message: error.message };
    }

    let href = `/tournament/${tournament.id}`;
    if (isPodFormat(tournament.format)) href = `/tournament/${tournament.id}/pods`;
    else if (tournament.status === 'pending' && needsSeating(tournament.format)) href = `/tournament/${tournament.id}/seating`;

    revalidatePath(href);
    if (tournament.event_id) revalidatePath(`/events/${tournament.event_id}`);
    return { success: true, tournamentId: tournament.id, href };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function dropActivityPlayer(tournamentId: string, participantId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return { success: false, message: 'Not authenticated' };

    const { data: tournament } = await supabase.from('tournaments').select('event_id').eq('id', tournamentId).single();
    if (!tournament?.event_id) return { success: false, message: 'Sitting is not on a weekend' };

    const { data: byId } = await supabase
      .from('tournament_participants')
      .select('id, profile_id')
      .eq('id', participantId)
      .maybeSingle();
    const { data: byProfile } = byId
      ? { data: null }
      : await supabase
        .from('tournament_participants')
        .select('id, profile_id')
        .eq('tournament_id', tournamentId)
        .eq('profile_id', participantId)
        .maybeSingle();
    const target = byId || byProfile;
    if (!target) return { success: false, message: 'That seat is not on this sitting' };

    const { data: membership } = await supabase
      .from('event_members')
      .select('role')
      .eq('event_id', tournament.event_id)
      .eq('profile_id', user.id)
      .maybeSingle();
    const allowed = membership?.role === 'owner' || membership?.role === 'admin' || user.id === target.profile_id;
    if (!allowed) return { success: false, message: 'Only the weekend host can drop another player' };

    await supabase
      .from('tournament_participants')
      .update({ dropped: true, draft_seat: null })
      .eq('id', target.id);

    revalidatePath(`/tournament/${tournamentId}`);
    revalidatePath(`/events/${tournament.event_id}`);
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function correctMatchResult(
  matchId: string,
  player1Id: string,
  player1Games: number,
  player2Id: string,
  player2Games: number,
  tournamentId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return { success: false, message: 'Not authenticated' };

    const { data: tournament } = await supabase.from('tournaments').select('event_id').eq('id', tournamentId).single();
    if (!tournament?.event_id) return { success: false, message: 'This match is not on a weekend' };

    const { data: membership } = await supabase
      .from('event_members')
      .select('role')
      .eq('event_id', tournament.event_id)
      .eq('profile_id', user.id)
      .maybeSingle();
    if (membership?.role !== 'owner' && membership?.role !== 'admin') {
      return { success: false, message: 'Only the weekend host can correct a score' };
    }

    let p1Result = 'draw';
    let p2Result = 'draw';
    if (player1Games > player2Games) { p1Result = 'win'; p2Result = 'loss'; }
    else if (player2Games > player1Games) { p1Result = 'loss'; p2Result = 'win'; }

    await setPlayerResult(supabase, matchId, player1Id, { result: p1Result, games_won: player1Games });
    await setPlayerResult(supabase, matchId, player2Id, { result: p2Result, games_won: player2Games });

    revalidatePath(`/tournament/${tournamentId}`);
    revalidatePath(`/events/${tournament.event_id}`);
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function createPod(tournamentId: string): Promise<{ success: boolean; message?: string; matchId?: string }> {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return { success: false, message: 'Not authenticated' };

    const { data: tournament } = await supabase.from('tournaments').select('id, format, event_id').eq('id', tournamentId).single();
    if (!tournament || !isPodFormat(tournament.format)) return { success: false, message: 'This sitting is not a pod' };

    const { count } = await supabase.from('matches').select('id', { count: 'exact', head: true }).eq('tournament_id', tournamentId);
    const tableNumber = (count || 0) + 1;

    const { data: match, error } = await supabase.from('matches').insert({
      tournament_id: tournamentId,
      event_id: tournament.event_id,
      round_number: null,
      game_type: tournament.format,
      table_number: tableNumber,
      join_code: makeCode(),
    }).select('id').single();
    if (error || !match) return { success: false, message: error?.message || 'Could not open a table' };

    await supabase.from('match_participants').insert({
      match_id: match.id,
      profile_id: user.id,
      result: null,
      games_won: 0,
    });

    revalidatePath(`/tournament/${tournamentId}/pods`);
    return { success: true, matchId: match.id };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function joinPod(matchId: string): Promise<{ success: boolean; message?: string; href?: string }> {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return { success: false, message: 'Not authenticated' };

    const { data: match } = await supabase
      .from('matches')
      .select('id, tournament_id, event_id, game_type, join_code')
      .eq('id', matchId)
      .single();
    if (!match) return { success: false, message: 'Table not found' };

    const { data: existing } = await supabase
      .from('match_participants')
      .select('id, result')
      .eq('match_id', matchId);

    const rows = existing || [];
    if (rows.some(r => r.result !== null) && rows.every(r => r.result !== null) && rows.length > 0) {
      return { success: false, message: 'That table already has a result' };
    }
    const { data: mine } = await supabase.from('match_participants').select('id').eq('match_id', matchId).eq('profile_id', user.id).maybeSingle();
    if (mine) return { success: true, href: `/tournament/${match.tournament_id}/pods` };

    const cap = match.game_type === 'two_headed_giant' ? 4 : match.game_type === 'commander' ? 4 : 8;
    if (rows.length >= cap) return { success: false, message: 'That table is full' };

    if (match.event_id) {
      const { data: member } = await supabase.from('event_members').select('profile_id').eq('event_id', match.event_id).eq('profile_id', user.id).maybeSingle();
      if (!member) {
        await supabase.from('event_members').insert({ event_id: match.event_id, profile_id: user.id, role: 'player' });
      }
    }

    const { error } = await supabase.from('match_participants').insert({
      match_id: matchId,
      profile_id: user.id,
      result: null,
      games_won: 0,
    });
    if (error) return { success: false, message: error.message };

    revalidatePath(`/tournament/${match.tournament_id}/pods`);
    return { success: true, href: `/tournament/${match.tournament_id}/pods` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function reportPodResult(matchId: string, winnerIds: string[]): Promise<{ success: boolean; message?: string }> {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return { success: false, message: 'Not authenticated' };
    if (winnerIds.length === 0) return { success: false, message: 'Pick a winner' };

    const { data: participants } = await supabase.from('match_participants').select('id, profile_id').eq('match_id', matchId);
    if (!participants || participants.length < 2) return { success: false, message: 'The table needs at least two players' };

    const playing = participants.some(p => p.profile_id === user.id);
    if (!playing) return { success: false, message: 'Only someone at the table can report it' };

    for (const participant of participants) {
      const won = winnerIds.includes(participant.profile_id);
      await supabase.from('match_participants').update({
        result: won ? 'win' : 'loss',
        games_won: won ? 1 : 0,
      }).eq('id', participant.id);
    }

    await supabase.from('matches').update({ completed_at: new Date().toISOString() }).eq('id', matchId);
    const { data: match } = await supabase.from('matches').select('tournament_id, event_id').eq('id', matchId).single();
    if (match?.tournament_id) revalidatePath(`/tournament/${match.tournament_id}/pods`);
    if (match?.event_id) revalidatePath(`/events/${match.event_id}`);
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function claimSeat(tournamentId: string, participantId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return { success: false, message: 'Not authenticated' };

    const { data: seat } = await supabase
      .from('tournament_participants')
      .select('id, profile_id, tournament_id')
      .eq('id', participantId)
      .eq('tournament_id', tournamentId)
      .maybeSingle();
    if (!seat) return { success: false, message: 'That seat is gone' };
    if (seat.profile_id) return { success: false, message: 'That seat is already claimed' };

    const { data: already } = await supabase
      .from('tournament_participants')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('profile_id', user.id)
      .maybeSingle();
    if (already) return { success: false, message: 'You already have a seat' };

    const { error } = await supabase
      .from('tournament_participants')
      .update({ profile_id: user.id })
      .eq('id', seat.id)
      .is('profile_id', null);
    if (error) return { success: false, message: error.message };

    await supabase
      .from('match_participants')
      .update({ profile_id: user.id })
      .eq('participant_id', seat.id);

    revalidatePath(`/tournament/${tournamentId}`);
    revalidatePath(`/tournament/${tournamentId}/seating`);
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function launchSitting(tournamentId: string, seatCount: number): Promise<{ success: boolean; message?: string }> {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return { success: false, message: 'Not authenticated' };

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, event_id, planned, format')
      .eq('id', tournamentId)
      .single();
    if (!tournament?.planned) return { success: false, message: 'This sitting is already running' };

    const { data: signedUp } = await supabase
      .from('tournament_participants')
      .select('id, profile_id')
      .eq('tournament_id', tournamentId)
      .eq('dropped', false)
      .order('created_at', { ascending: true });

    const named = (signedUp || []).filter((person) => person.profile_id);
    const count = Math.max(seatCount || 0, named.length);
    if (!isPodFormat(tournament.format) && count < 2) return { success: false, message: 'A draft needs at least two seats' };

    for (let index = 0; index < named.length; index += 1) {
      await supabase.from('tournament_participants').update({ draft_seat: index + 1 }).eq('id', named[index].id);
    }
    for (let seat = named.length + 1; seat <= count; seat += 1) {
      const { error } = await supabase.from('tournament_participants').insert({
        tournament_id: tournamentId,
        profile_id: null,
        draft_seat: seat,
        dropped: false,
      });
      if (error) return { success: false, message: error.message };
    }

    await supabase.from('tournaments').update({ planned: false, status: isPodFormat(tournament.format) ? 'active' : 'pending' }).eq('id', tournamentId);
    if (tournament.event_id) revalidatePath(`/events/${tournament.event_id}`);
    const href = isPodFormat(tournament.format) ? `/tournament/${tournamentId}/pods` : needsSeating(tournament.format) ? `/tournament/${tournamentId}/seating` : `/tournament/${tournamentId}`;
    redirect(href);
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error && (error as any).digest?.startsWith('NEXT_REDIRECT')) throw error;
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function setProductBringer(tournamentId: string, bringing: boolean): Promise<{ success: boolean; message?: string }> {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return { success: false, message: 'Not authenticated' };
    await supabase.from('tournaments').update({
      brought_by: bringing ? user.id : null,
      abdicated: !bringing,
    }).eq('id', tournamentId);
    const { data: tournament } = await supabase.from('tournaments').select('event_id').eq('id', tournamentId).single();
    if (tournament?.event_id) revalidatePath(`/events/${tournament.event_id}`);
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function attachBudgetDeck(tournamentId: string, rawUrl: string): Promise<{ success: boolean; message?: string }> {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return { success: false, message: 'Not authenticated' };
    const loaded = await fetchBudgetDeck(rawUrl);
    if (!loaded.snapshot) return { success: false, message: loaded.message || 'Could not read that deck' };

    const { data: seat } = await supabase
      .from('tournament_participants')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('profile_id', user.id)
      .maybeSingle();

    const patch = {
      budget_url: loaded.snapshot.url,
      budget_name: loaded.snapshot.name,
      budget_price: loaded.snapshot.price,
      budget_list: loaded.snapshot.list,
    };

    if (seat) {
      const { error } = await supabase.from('tournament_participants').update(patch).eq('id', seat.id);
      if (error) return { success: false, message: error.message };
    } else {
      const { error } = await supabase.from('tournament_participants').insert({
        tournament_id: tournamentId,
        profile_id: user.id,
        draft_seat: null,
        dropped: false,
        ...patch,
      });
      if (error) return { success: false, message: error.message };
    }

    revalidatePath(`/tournament/${tournamentId}`);
    revalidatePath(`/tournament/${tournamentId}/pods`);
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function weekendMember(supabase: Awaited<ReturnType<typeof createClient>>, eventId: string, userId: string) {
  const { data } = await supabase
    .from('event_members')
    .select('role')
    .eq('event_id', eventId)
    .eq('profile_id', userId)
    .maybeSingle();
  return data;
}

export async function assignSeatPerson(
  tournamentId: string,
  participantId: string,
  profileId: string | null
): Promise<{ success: boolean; message?: string }> {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return { success: false, message: 'Not authenticated' };

    const { data: tournament } = await supabase.from('tournaments').select('event_id').eq('id', tournamentId).single();
    if (!tournament?.event_id) return { success: false, message: 'Sitting is not on a weekend' };
    const member = await weekendMember(supabase, tournament.event_id, user.id);
    if (!member) return { success: false, message: 'Join the weekend before assigning seats' };

    if (profileId) {
      const { data: onRoster } = await supabase
        .from('event_members')
        .select('profile_id')
        .eq('event_id', tournament.event_id)
        .eq('profile_id', profileId)
        .maybeSingle();
      if (!onRoster) return { success: false, message: 'That person is not on the weekend' };

      await supabase
        .from('tournament_participants')
        .update({ profile_id: null })
        .eq('tournament_id', tournamentId)
        .eq('profile_id', profileId)
        .neq('id', participantId);
    }

    const { error } = await supabase
      .from('tournament_participants')
      .update({ profile_id: profileId })
      .eq('id', participantId)
      .eq('tournament_id', tournamentId);
    if (error) return { success: false, message: error.message };

    await supabase
      .from('match_participants')
      .update({ profile_id: profileId })
      .eq('participant_id', participantId);

    revalidatePath(`/tournament/${tournamentId}`);
    revalidatePath(`/tournament/${tournamentId}/seating`);
    revalidatePath(`/events/${tournament.event_id}`);
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function addOpenSeat(tournamentId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return { success: false, message: 'Not authenticated' };

    const { data: tournament } = await supabase.from('tournaments').select('event_id').eq('id', tournamentId).single();
    if (!tournament?.event_id) return { success: false, message: 'Sitting is not on a weekend' };
    const member = await weekendMember(supabase, tournament.event_id, user.id);
    if (!member) return { success: false, message: 'Join the weekend before adding a seat' };

    const { data: seats } = await supabase
      .from('tournament_participants')
      .select('draft_seat')
      .eq('tournament_id', tournamentId)
      .eq('dropped', false);
    const next = Math.max(0, ...(seats || []).map((seat) => seat.draft_seat || 0)) + 1;
    const { error } = await supabase.from('tournament_participants').insert({
      tournament_id: tournamentId,
      profile_id: null,
      draft_seat: next,
      dropped: false,
    });
    if (error) return { success: false, message: error.message };

    revalidatePath(`/tournament/${tournamentId}`);
    revalidatePath(`/tournament/${tournamentId}/seating`);
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}
