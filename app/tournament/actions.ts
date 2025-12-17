'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  generateSwissPairings,
  calculateStandings,
  sortStandings,
  convertDbMatchToMatchResult,
  POINTS_WIN,
  POINTS_DRAW,
  POINTS_LOSS,
  BYE_GAMES_WON,
  type MatchResult,
} from '@/lib/swiss-pairing';
import { TimerData, TimerControlResult } from '@/lib/types';

interface CreateTournamentResult {
  success: boolean;
  message?: string;
  tournamentId?: string;
}

export async function createTournament(
  name: string,
  playerIds: string[],
  format: string = 'draft',
  maxRounds: number = 3,
  roundDurationMinutes: number = 50,
  prize1st?: string,
  prize2nd?: string,
  prize3rd?: string,
  eventId?: string // Added eventId parameter
): Promise<CreateTournamentResult> {
  try {
    if (!name || name.trim().length === 0) {
      return { success: false, message: 'Tournament name is required' };
    }

    if (playerIds.length < 2) {
      return { success: false, message: 'At least 2 players are required' };
    }

    const supabase = await createClient();

    // Validate max_rounds
    if (maxRounds < 1 || maxRounds > 10) {
      return { success: false, message: 'Number of rounds must be between 1 and 10' };
    }

    if (roundDurationMinutes < 1) {
      return { success: false, message: 'Round duration must be positive' };
    }

    // Step 1: Create tournament entry with 'pending' status
    // Tournament becomes 'active' when Round 1 actually starts (in startDraft)
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .insert({
        name: name.trim(),
        format,
        status: 'pending', // Will become 'active' when draft starts
        max_rounds: maxRounds,
        round_duration_minutes: roundDurationMinutes,
        prize_1st: prize1st || null,
        prize_2nd: prize2nd || null,
        prize_3rd: prize3rd || null,
        event_id: eventId || null, // Include event_id
      })
      .select()
      .single();

    if (tournamentError || !tournament) {
      console.error('Error creating tournament:', tournamentError);
      return { 
        success: false, 
        message: tournamentError?.message || 'Failed to create tournament' 
      };
    }

    // Step 2: Create tournament participants WITHOUT draft seats (seats will be assigned on seating page)
    // Note: draft_seat must be nullable for this to work (see migration)
    for (const playerId of playerIds) {
      const { error: participantError } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournament.id,
          player_id: playerId,
          // draft_seat will be NULL initially, set when player selects seat
        });

      if (participantError) {
        console.error('Error creating tournament participant:', participantError);
        return { 
          success: false, 
          message: `Failed to create tournament participant: ${participantError.message}` 
        };
      }
    }

    // Step 3: Redirect to draft seating page
    redirect(`/tournament/${tournament.id}/seating`);
  } catch (error) {
    // Re-throw redirect errors (they're expected - redirect() throws to perform redirect)
    // Check if it's a redirect error by checking for the NEXT_REDIRECT symbol
    if (error && typeof error === 'object' && 'digest' in error) {
      const digest = (error as { digest?: string }).digest;
      if (digest?.startsWith('NEXT_REDIRECT')) {
        throw error; // Re-throw redirect errors
      }
    }
    
    // Log the actual error for debugging
    console.error('Error in createTournament:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
      console.error('Error message:', error.message);
    }
    console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}

// ... rest of the file remains unchanged
interface SubmitResultResult {
  success: boolean;
  message?: string;
  nextRoundGenerated?: boolean;
}

/**
 * Submit match result with game scores and deck IDs for tiebreaker tracking
 */
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

    // Determine results
    const isDraw = player1Games === player2Games;
    let p1Result: 'win' | 'loss' | 'draw';
    let p2Result: 'win' | 'loss' | 'draw';

    if (isDraw) {
      p1Result = 'draw';
      p2Result = 'draw';
    } else if (player1Games > player2Games) {
      p1Result = 'win';
      p2Result = 'loss';
    } else {
      p1Result = 'loss';
      p2Result = 'win';
    }

    // Update match participants with results, games won, and deck IDs
    const { error: p1Error } = await supabase
      .from('match_participants')
      .update({
        result: p1Result,
        games_won: player1Games,
        deck_id: player1DeckId,
      })
      .eq('match_id', matchId)
      .eq('player_id', player1Id);

    if (p1Error) {
      console.error('Error updating player 1 result:', p1Error);
      return { success: false, message: `Failed to update result for ${player1Id}: ${p1Error.message}` };
    }

    const { error: p2Error } = await supabase
      .from('match_participants')
      .update({
        result: p2Result,
        games_won: player2Games,
        deck_id: player2DeckId,
      })
      .eq('match_id', matchId)
      .eq('player_id', player2Id);

    if (p2Error) {
      console.error('Error updating player 2 result:', p2Error);
      return { success: false, message: `Failed to update result for ${player2Id}: ${p2Error.message}` };
    }

    // Check if all matches in the current round are complete
    const { data: match } = await supabase
      .from('matches')
      .select('round_number')
      .eq('id', matchId)
      .single();

    if (!match) {
      return { success: false, message: 'Match not found' };
    }

    // Get all matches for this round
    const { data: roundMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('round_number', match.round_number);

    if (!roundMatches || roundMatches.length === 0) {
      return { success: false, message: 'No matches found for this round' };
    }

    // Check if all matches have results
    const matchIds = roundMatches.map((m) => m.id);
    const { data: allParticipants } = await supabase
      .from('match_participants')
      .select('match_id, result')
      .in('match_id', matchIds);

    // Group participants by match
    const participantsByMatch = new Map<string, { withResult: number; total: number }>();

    allParticipants?.forEach((p) => {
      if (!participantsByMatch.has(p.match_id)) {
        participantsByMatch.set(p.match_id, { withResult: 0, total: 0 });
      }
      const matchData = participantsByMatch.get(p.match_id)!;
      matchData.total++;
      if (p.result !== null) {
        matchData.withResult++;
      }
    });

    // A match is complete if all its participants have results
    const allMatchesComplete = roundMatches.every((m) => {
      const matchData = participantsByMatch.get(m.id);
      if (!matchData || matchData.total === 0) return false;
      return matchData.withResult === matchData.total;
    });

    // Generate next round if all matches are complete
    let nextRoundGenerated = false;
    if (allMatchesComplete) {
      await generateNextRound(tournamentId, match.round_number);
      nextRoundGenerated = true;
    }

    // Revalidate the tournament page and redirect
    revalidatePath(`/tournament/${tournamentId}`);

    const redirectUrl = nextRoundGenerated
      ? `/tournament/${tournamentId}?roundGenerated=true`
      : `/tournament/${tournamentId}`;

    redirect(redirectUrl);
  } catch (error) {
    // Re-throw redirect errors
    if (error && typeof error === 'object' && 'digest' in error) {
      const digest = (error as { digest?: string }).digest;
      if (digest?.startsWith('NEXT_REDIRECT')) {
        throw error;
      }
    }

    console.error('Error in submitResultWithGames:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}

export async function submitDraw(
  matchId: string,
  playerIds: string[],
  tournamentId: string
): Promise<SubmitResultResult> {
  try {
    const supabase = await createClient();

    // Update both participants to 'draw'
    const { error: updateError } = await supabase
      .from('match_participants')
      .update({ result: 'draw' })
      .eq('match_id', matchId)
      .in('player_id', playerIds);

    if (updateError) {
      console.error('Error updating draw result:', updateError);
      return { success: false, message: `Failed to update draw result: ${updateError.message}` };
    }

    // Check if all matches in the current round are complete
    const { data: match } = await supabase
      .from('matches')
      .select('round_number')
      .eq('id', matchId)
      .single();

    if (!match) {
      return { success: false, message: 'Match not found' };
    }

    // Get all matches for this round
    const { data: roundMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('round_number', match.round_number);

    if (!roundMatches || roundMatches.length === 0) {
      return { success: false, message: 'No matches found for this round' };
    }

    // Check if all matches have results
    const matchIds = roundMatches.map((m) => m.id);
    const { data: allParticipants } = await supabase
      .from('match_participants')
      .select('match_id, result')
      .in('match_id', matchIds);

    // Group participants by match
    const participantsByMatch = new Map<string, { withResult: number; total: number }>();
    
    allParticipants?.forEach((p) => {
      if (!participantsByMatch.has(p.match_id)) {
        participantsByMatch.set(p.match_id, { withResult: 0, total: 0 });
      }
      const matchData = participantsByMatch.get(p.match_id)!;
      matchData.total++;
      if (p.result !== null) {
        matchData.withResult++;
      }
    });

    // A match is complete if all its participants have results
    const allMatchesComplete = roundMatches.every((m) => {
      const matchData = participantsByMatch.get(m.id);
      if (!matchData || matchData.total === 0) return false;
      return matchData.withResult === matchData.total;
    });

    // Generate next round if all matches are complete
    let nextRoundGenerated = false;
    if (allMatchesComplete) {
      await generateNextRound(tournamentId, match.round_number);
      nextRoundGenerated = true;
    }

    // Revalidate the tournament page and redirect
    revalidatePath(`/tournament/${tournamentId}`);
    
    const redirectUrl = nextRoundGenerated 
      ? `/tournament/${tournamentId}?roundGenerated=true`
      : `/tournament/${tournamentId}`;
    
    redirect(redirectUrl);
  } catch (error) {
    // Re-throw redirect errors
    if (error && typeof error === 'object' && 'digest' in error) {
      const digest = (error as { digest?: string }).digest;
      if (digest?.startsWith('NEXT_REDIRECT')) {
        throw error;
      }
    }

    console.error('Error in submitDraw:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}

export async function submitResult(
  matchId: string,
  winnerId: string,
  loserId: string,
  tournamentId: string
): Promise<SubmitResultResult> {
  try {
    const supabase = await createClient();

    // Step 1: Update match_participants table
    const { error: winnerError } = await supabase
      .from('match_participants')
      .update({ result: 'win' })
      .eq('match_id', matchId)
      .eq('player_id', winnerId);

    if (winnerError) {
      console.error('Error updating winner:', winnerError);
      return { success: false, message: `Failed to update winner: ${winnerError.message}` };
    }

    const { error: loserError } = await supabase
      .from('match_participants')
      .update({ result: 'loss' })
      .eq('match_id', matchId)
      .eq('player_id', loserId);

    if (loserError) {
      console.error('Error updating loser:', loserError);
      return { success: false, message: `Failed to update loser: ${loserError.message}` };
    }

    // Step 2: Check if all matches in the current round are complete
    const { data: match } = await supabase
      .from('matches')
      .select('round_number')
      .eq('id', matchId)
      .single();

    if (!match) {
      return { success: false, message: 'Match not found' };
    }

    // Get all matches for this round
    const { data: roundMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('round_number', match.round_number);

    if (!roundMatches || roundMatches.length === 0) {
      return { success: false, message: 'No matches found for this round' };
    }

    // Check if all matches have results
    // For each match, we need to check that all participants have results
    const matchIds = roundMatches.map((m) => m.id);
    const { data: allParticipants } = await supabase
      .from('match_participants')
      .select('match_id, result')
      .in('match_id', matchIds);

    // Group participants by match
    const participantsByMatch = new Map<string, { withResult: number; total: number }>();
    
    allParticipants?.forEach((p) => {
      if (!participantsByMatch.has(p.match_id)) {
        participantsByMatch.set(p.match_id, { withResult: 0, total: 0 });
      }
      const matchData = participantsByMatch.get(p.match_id)!;
      matchData.total++;
      if (p.result !== null) {
        matchData.withResult++;
      }
    });

    // A match is complete if all its participants have results
    const allMatchesComplete = roundMatches.every((m) => {
      const matchData = participantsByMatch.get(m.id);
      if (!matchData || matchData.total === 0) return false;
      // All participants in the match must have results
      return matchData.withResult === matchData.total;
    });

    // Step 3: Generate next round if all matches are complete
    let nextRoundGenerated = false;
    if (allMatchesComplete) {
      await generateNextRound(tournamentId, match.round_number);
      nextRoundGenerated = true;
    }

    // Revalidate the tournament page and redirect
    revalidatePath(`/tournament/${tournamentId}`);
    
    // Store next round flag in a way that can be accessed after redirect
    // Since we redirect, we'll pass it via URL parameter
    const redirectUrl = nextRoundGenerated 
      ? `/tournament/${tournamentId}?roundGenerated=true`
      : `/tournament/${tournamentId}`;
    
    redirect(redirectUrl);
  } catch (error) {
    // Re-throw redirect errors
    if (error && typeof error === 'object' && 'digest' in error) {
      const digest = (error as { digest?: string }).digest;
      if (digest?.startsWith('NEXT_REDIRECT')) {
        throw error;
      }
    }

    console.error('Error in submitResult:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}

/**
 * Generate the next round of Swiss pairings
 * 
 * Uses MTG tournament rules:
 * - Point system: Win=3, Draw=1, Loss=0
 * - OMW% as primary tiebreaker
 * - Bye rotation (prioritize players without byes)
 * - Match history tracking to prevent rematches
 */
async function generateNextRound(tournamentId: string, currentRound: number): Promise<void> {
  try {
    const supabase = await createClient();

    // Fetch tournament to get format and max_rounds
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('format, max_rounds, status')
      .eq('id', tournamentId)
      .single();

    if (!tournament) {
      console.error('Tournament not found');
      return;
    }

    // Check if we've reached the maximum number of rounds
    const maxRounds = tournament.max_rounds || 3; // Default to 3 if not set (for existing tournaments)
    if (currentRound >= maxRounds) {
      // Mark tournament as completed
      await supabase
        .from('tournaments')
        .update({ status: 'completed' })
        .eq('id', tournamentId);
      
      console.log(`Tournament ${tournamentId} completed after ${currentRound} rounds`);
      return;
    }

    // Step 1: Get all tournament participants
    const { data: tournamentParticipants } = await supabase
      .from('tournament_participants')
      .select('player_id')
      .eq('tournament_id', tournamentId);

    if (!tournamentParticipants || tournamentParticipants.length < 2) {
      console.error('Not enough players for next round');
      return;
    }

    const playerIds = tournamentParticipants.map((tp) => tp.player_id);

    // Step 2: Fetch all completed matches with participants
    const { data: allMatches } = await supabase
      .from('matches')
      .select('id, round_number')
      .eq('tournament_id', tournamentId)
      .lte('round_number', currentRound);

    if (!allMatches || allMatches.length === 0) {
      console.error('No matches found for tournament');
      return;
    }

    const matchIds = allMatches.map((m) => m.id);
    const { data: allParticipants } = await supabase
      .from('match_participants')
      .select('match_id, player_id, result, games_won')
      .in('match_id', matchIds);

    // Step 3: Build match history for Swiss pairing
    const matchHistory: MatchResult[] = [];
    
    // Group participants by match
    const participantsByMatch = new Map<string, { playerId: string; result: 'win' | 'loss' | 'draw' | null; gamesWon: number }[]>();
    allParticipants?.forEach((p) => {
      if (!participantsByMatch.has(p.match_id)) {
        participantsByMatch.set(p.match_id, []);
      }
      participantsByMatch.get(p.match_id)!.push({
        playerId: p.player_id,
        result: p.result as 'win' | 'loss' | 'draw' | null,
        gamesWon: p.games_won || 0,
      });
    });

    // Convert to MatchResult format
    for (const match of allMatches) {
      const participants = participantsByMatch.get(match.id) || [];
      if (participants.length > 0) {
        matchHistory.push(
          convertDbMatchToMatchResult(
            match.id,
            match.round_number || 1,
            participants.map((p) => ({ playerId: p.playerId, result: p.result }))
          )
        );
      }
    }

    // Step 4: Generate Swiss pairings using the new algorithm
    // This handles OMW% tiebreakers, bye rotation, and rematch prevention
    const { pairings, warnings } = generateSwissPairings(playerIds, matchHistory);

    // Log any warnings (rematches, multiple byes, etc.)
    if (warnings.length > 0) {
      console.log('Swiss pairing warnings:', warnings);
    }

    // Step 5: Create matches and match_participants for next round
    const nextRound = currentRound + 1;

    for (const pairing of pairings) {
      if (!pairing.player2) {
        // Bye - player gets automatic win with 2 game wins (standard bye score)
        const { data: match, error: matchError } = await supabase
          .from('matches')
          .insert({
            tournament_id: tournamentId,
            round_number: nextRound,
            game_type: tournament.format,
          })
          .select()
          .single();

        if (matchError || !match) {
          console.error('Error creating bye match:', matchError);
          continue;
        }

        const { error: participantError } = await supabase.from('match_participants').insert({
          match_id: match.id,
          player_id: pairing.player1,
          result: 'win',
          games_won: BYE_GAMES_WON, // Standard bye score is 2-0
        });

        if (participantError) {
          console.error('Error creating bye participant:', participantError);
        }
      } else {
        // Normal match
        const { data: match, error: matchError } = await supabase
          .from('matches')
          .insert({
            tournament_id: tournamentId,
            round_number: nextRound,
            game_type: tournament.format,
          })
          .select()
          .single();

        if (matchError || !match) {
          console.error('Error creating match:', matchError);
          continue;
        }

        const { error: participantsError } = await supabase.from('match_participants').insert([
          {
            match_id: match.id,
            player_id: pairing.player1,
            result: null,
          },
          {
            match_id: match.id,
            player_id: pairing.player2,
            result: null,
          },
        ]);

        if (participantsError) {
          console.error('Error creating match participants:', participantsError);
        }
      }
    }
  } catch (error) {
    console.error('Error in generateNextRound:', error);
    throw error;
  }
}

// A helper function to fetch the combined timer data
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
    .maybeSingle(); // Use maybeSingle to handle case where no match exists yet

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

    // Get tournament duration
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('round_duration_minutes')
      .eq('id', tournamentId)
      .single();

    if (!tournament) {
      return { success: false, message: 'Tournament not found' };
    }

    const { data: matches } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('round_number', roundNumber);

    if (!matches || matches.length === 0) {
      return { success: false, message: 'No matches found for this round' };
    }

    const now = new Date().toISOString();
    const durationMinutes = tournament.round_duration_minutes;
    const initialSeconds = durationMinutes * 60;
    
    // Debug logging
    console.log('[startRoundTimer] duration minutes:', durationMinutes);
    console.log('[startRoundTimer] initial seconds:', initialSeconds);
    console.log('[startRoundTimer] started_at:', now);
    
    // Sanity check - duration should be reasonable (1-300 minutes)
    if (initialSeconds < 60 || initialSeconds > 18000) {
      console.error('[startRoundTimer] Invalid initial seconds:', initialSeconds);
      return { success: false, message: `Invalid duration: ${durationMinutes} minutes` };
    }
    
    const { error } = await supabase
      .from('matches')
      .update({
        started_at: now,
        paused_at: null,
        remaining_seconds: initialSeconds,
      })
      .eq('tournament_id', tournamentId)
      .eq('round_number', roundNumber);

    if (error) {
      console.error('Error starting timer:', error);
      return { success: false, message: error.message };
    }

    const updatedTimerData = await getTimerData(supabase, tournamentId, roundNumber);
    if (!updatedTimerData) {
      return { success: false, message: 'Failed to fetch updated timer data.' };
    }
    
    console.log('[startRoundTimer] returning timerData:', updatedTimerData);

    return { success: true, updatedTimerData };
  } catch (error) {
    console.error('Error in startRoundTimer:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}

export async function pauseRoundTimer(
  tournamentId: string,
  roundNumber: number
): Promise<TimerControlResult> {
  try {
    const supabase = await createClient();

    const { data: match } = await supabase
      .from('matches')
      .select('started_at, paused_at, remaining_seconds')
      .eq('tournament_id', tournamentId)
      .eq('round_number', roundNumber)
      .limit(1)
      .single();

    if (!match || !match.started_at) {
      return { success: false, message: 'Timer not started' };
    }

    if (match.paused_at) {
      return { success: false, message: 'Timer already paused' };
    }

    // Calculate how much time has elapsed since the timer started (or resumed)
    const now = new Date();
    
    // Fix timezone: database stores timestamp without timezone, treat as UTC
    let startedAtStr = match.started_at;
    if (!startedAtStr.endsWith('Z') && !startedAtStr.match(/[+-]\d{2}:\d{2}$/)) {
      startedAtStr = startedAtStr + 'Z';
    }
    const startedAt = new Date(startedAtStr);
    const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
    
    // Debug logging
    console.log('[pauseRoundTimer] match.remaining_seconds:', match.remaining_seconds);
    console.log('[pauseRoundTimer] started_at (raw):', match.started_at);
    console.log('[pauseRoundTimer] started_at (fixed):', startedAtStr);
    console.log('[pauseRoundTimer] now:', now.toISOString());
    console.log('[pauseRoundTimer] elapsedSeconds:', elapsedSeconds);
    
    // Sanity check - elapsed should be positive and reasonable
    if (elapsedSeconds < 0) {
      console.error('[pauseRoundTimer] Negative elapsed time detected!');
      // If elapsed is negative, something is wrong with timestamps - just use current remaining
      const newRemainingSeconds = Math.max(0, match.remaining_seconds || 0);
      console.log('[pauseRoundTimer] Using existing remaining_seconds:', newRemainingSeconds);
      
      const { error } = await supabase
        .from('matches')
        .update({ 
          paused_at: now.toISOString(),
        })
        .eq('tournament_id', tournamentId)
        .eq('round_number', roundNumber);

      if (error) {
        console.error('Error pausing timer:', error);
        return { success: false, message: error.message };
      }
    } else {
      // Calculate new remaining seconds (don't go below 0)
      const currentRemaining = match.remaining_seconds || 0;
      const newRemainingSeconds = Math.max(0, currentRemaining - elapsedSeconds);
      
      console.log('[pauseRoundTimer] currentRemaining:', currentRemaining);
      console.log('[pauseRoundTimer] newRemainingSeconds:', newRemainingSeconds);
      
      // Sanity check - new remaining should not exceed current! Using current value if it does.
      const finalRemainingSeconds = (newRemainingSeconds > currentRemaining && currentRemaining > 0) ? currentRemaining : newRemainingSeconds;

      const { error } = await supabase
        .from('matches')
        .update({ 
          paused_at: now.toISOString(),
          remaining_seconds: finalRemainingSeconds,
        })
        .eq('tournament_id', tournamentId)
        .eq('round_number', roundNumber);

      if (error) {
        console.error('Error pausing timer:', error);
        return { success: false, message: error.message };
      }
    }

    const updatedTimerData = await getTimerData(supabase, tournamentId, roundNumber);
    if (!updatedTimerData) {
      return { success: false, message: 'Failed to fetch updated timer data.' };
    }
    
    console.log('[pauseRoundTimer] returning timerData:', updatedTimerData);

    return { success: true, updatedTimerData };
  } catch (error) {
    console.error('Error in pauseRoundTimer:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}

export async function resumeRoundTimer(
  tournamentId: string,
  roundNumber: number
): Promise<TimerControlResult> {
  try {
    const supabase = await createClient();

    const { data: match } = await supabase
      .from('matches')
      .select('started_at, paused_at, remaining_seconds')
      .eq('tournament_id', tournamentId)
      .eq('round_number', roundNumber)
      .limit(1)
      .single();

    if (!match || !match.started_at) {
      return { success: false, message: 'Timer not started' };
    }
    if (!match.paused_at) {
      return { success: false, message: 'Timer not paused' };
    }

    // Debug logging
    console.log('[resumeRoundTimer] match.remaining_seconds:', match.remaining_seconds);
    console.log('[resumeRoundTimer] match.paused_at:', match.paused_at);

    // Simply set a new start time and clear paused_at
    // remaining_seconds already holds the correct value from when we paused
    const now = new Date().toISOString();
    
    console.log('[resumeRoundTimer] new started_at:', now);

    const { error } = await supabase
      .from('matches')
      .update({
        started_at: now,
        paused_at: null,
      })
      .eq('tournament_id', tournamentId)
      .eq('round_number', roundNumber);

    if (error) {
      console.error('Error resuming timer:', error);
      return { success: false, message: error.message };
    }

    const updatedTimerData = await getTimerData(supabase, tournamentId, roundNumber);
    if (!updatedTimerData) {
      return { success: false, message: 'Failed to fetch updated timer data.' };
    }
    
    console.log('[resumeRoundTimer] returning timerData:', updatedTimerData);

    return { success: true, updatedTimerData };
  } catch (error) {
    console.error('Error in resumeRoundTimer:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
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

    // Step 1: Update the tournament's duration
    const { error: tournamentError } = await supabase
      .from('tournaments')
      .update({ round_duration_minutes: newDurationMinutes })
      .eq('id', tournamentId);

    if (tournamentError) {
      console.error('Error updating round duration:', tournamentError);
      return { success: false, message: tournamentError.message };
    }

    // Step 2: Find the current round number
    const { data: activeRoundData } = await supabase
      .from('matches')
      .select('round_number')
      .eq('tournament_id', tournamentId)
      .order('round_number', { ascending: false })
      .limit(1)
      .single();

    // If there are no rounds/matches yet, there's nothing to reset.
    if (!activeRoundData) {
      return { 
        success: true, 
        updatedTimerData: { 
          roundDurationMinutes: newDurationMinutes,
          startedAt: null,
          pausedAt: null,
          remainingSeconds: null
        } 
      };
    }
    const currentRound = activeRoundData.round_number;

    // Step 3: Reset the timer state for all matches in the current round
    const { error: matchesError } = await supabase
      .from('matches')
      .update({
        started_at: null,
        paused_at: null,
        remaining_seconds: null,
      })
      .eq('tournament_id', tournamentId)
      .eq('round_number', currentRound);

    if (matchesError) {
      console.error('Error resetting round timer state:', matchesError);
      return { success: false, message: 'Failed to reset timer state after duration update.' };
    }
    
    // Step 4: Fetch and return the fresh, reset timer data
    const updatedTimerData = await getTimerData(supabase, tournamentId, currentRound);
    if (!updatedTimerData) {
      return { success: false, message: 'Failed to fetch updated timer data after duration update.' };
    }

    return { success: true, updatedTimerData };
  } catch (error) {
    console.error('Error in updateRoundDuration:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}

/**
 * Submit match result with game scores - no redirect version for dashboard
 * Same as submitResultWithGames but doesn't redirect, returns result instead
 */
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

    // Determine results
    const isDraw = player1Games === player2Games;
    let p1Result: 'win' | 'loss' | 'draw';
    let p2Result: 'win' | 'loss' | 'draw';

    if (isDraw) {
      p1Result = 'draw';
      p2Result = 'draw';
    } else if (player1Games > player2Games) {
      p1Result = 'win';
      p2Result = 'loss';
    } else {
      p1Result = 'loss';
      p2Result = 'win';
    }

    // Update match participants with results, games won, and deck IDs
    const { error: p1Error } = await supabase
      .from('match_participants')
      .update({
        result: p1Result,
        games_won: player1Games,
        deck_id: player1DeckId,
      })
      .eq('match_id', matchId)
      .eq('player_id', player1Id);

    if (p1Error) {
      console.error('Error updating player 1 result:', p1Error);
      return { success: false, message: `Failed to update result for ${player1Id}: ${p1Error.message}` };
    }

    const { error: p2Error } = await supabase
      .from('match_participants')
      .update({
        result: p2Result,
        games_won: player2Games,
        deck_id: player2DeckId,
      })
      .eq('match_id', matchId)
      .eq('player_id', player2Id);

    if (p2Error) {
      console.error('Error updating player 2 result:', p2Error);
      return { success: false, message: `Failed to update result for ${player2Id}: ${p2Error.message}` };
    }

    // Check if all matches in the current round are complete
    const { data: match } = await supabase
      .from('matches')
      .select('round_number')
      .eq('id', matchId)
      .single();

    if (!match) {
      return { success: false, message: 'Match not found' };
    }

    // Get all matches for this round
    const { data: roundMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('round_number', match.round_number);

    if (!roundMatches || roundMatches.length === 0) {
      return { success: false, message: 'No matches found for this round' };
    }

    // Check if all matches have results
    const matchIds = roundMatches.map((m) => m.id);
    const { data: allParticipants } = await supabase
      .from('match_participants')
      .select('match_id, result')
      .in('match_id', matchIds);

    // Group participants by match
    const participantsByMatch = new Map<string, { withResult: number; total: number }>();

    allParticipants?.forEach((p) => {
      if (!participantsByMatch.has(p.match_id)) {
        participantsByMatch.set(p.match_id, { withResult: 0, total: 0 });
      }
      const matchData = participantsByMatch.get(p.match_id)!;
      matchData.total++;
      if (p.result !== null) {
        matchData.withResult++;
      }
    });

    // A match is complete if all its participants have results
    const allMatchesComplete = roundMatches.every((m) => {
      const matchData = participantsByMatch.get(m.id);
      if (!matchData || matchData.total === 0) return false;
      return matchData.withResult === matchData.total;
    });

    // Generate next round if all matches are complete
    let nextRoundGenerated = false;
    if (allMatchesComplete) {
      await generateNextRound(tournamentId, match.round_number);
      nextRoundGenerated = true;
    }

    // Revalidate paths but don't redirect
    revalidatePath(`/tournament/${tournamentId}`);
    revalidatePath(`/tournament/${tournamentId}/dashboard`);

    return { success: true, nextRoundGenerated };
  } catch (error) {
    console.error('Error in submitResultWithGamesNoRedirect:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}

interface RandomizeSeatingResult {
  success: boolean;
  message?: string;
}

export async function randomizeSeating(tournamentId: string): Promise<RandomizeSeatingResult> {
  try {
    const supabase = await createClient();

    // Fetch all participants
    const { data: participants, error: fetchError } = await supabase
      .from('tournament_participants')
      .select('id, player_id')
      .eq('tournament_id', tournamentId);

    if (fetchError || !participants) {
      console.error('Error fetching participants:', fetchError);
      return { success: false, message: 'Failed to fetch participants' };
    }

    if (participants.length === 0) {
      return { success: false, message: 'No participants to seat' };
    }

    // Shuffle participants
    const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);

    // Assign seats
    // We update each participant one by one. In a real app with many users, batch update would be better.
    // But for < 20 users, this is fine.
    // First, we need to clear existing seats to avoid unique constraint violations if we are just swapping them around?
    // The constraint is UNIQUE(tournament_id, draft_seat).
    // If we update player A to seat 1, and player B is already in seat 1, it might fail.
    // So safest way is to clear all seats first, then assign.
    
    // Clear all seats
    const { error: clearError } = await supabase
      .from('tournament_participants')
      .update({ draft_seat: null })
      .eq('tournament_id', tournamentId);

    if (clearError) {
      console.error('Error clearing seats:', clearError);
      return { success: false, message: 'Failed to clear existing seats' };
    }

    // Assign new seats
    for (let i = 0; i < shuffledParticipants.length; i++) {
      const participant = shuffledParticipants[i];
      const seatNumber = i + 1;

      const { error: updateError } = await supabase
        .from('tournament_participants')
        .update({ draft_seat: seatNumber })
        .eq('id', participant.id);

      if (updateError) {
        console.error(`Error assigning seat ${seatNumber} to participant ${participant.id}:`, updateError);
        return { success: false, message: `Failed to assign seat ${seatNumber}` };
      }
    }

    revalidatePath(`/tournament/${tournamentId}/seating`);
    return { success: true };
  } catch (error) {
    console.error('Error in randomizeSeating:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}

interface SelectSeatResult {
  success: boolean;
  message?: string;
}

export async function selectSeat(
  tournamentId: string,
  playerId: string,
  seatNumber: number | null
): Promise<SelectSeatResult> {
  try {
    const supabase = await createClient();

    // If clearing a seat (seatNumber is null), just update that player's seat to null
    if (seatNumber === null) {
      const { error } = await supabase
        .from('tournament_participants')
        .update({ draft_seat: null })
        .eq('tournament_id', tournamentId)
        .eq('player_id', playerId);

      if (error) {
        console.error('Error clearing seat:', error);
        return { success: false, message: error.message };
      }

      revalidatePath(`/tournament/${tournamentId}/seating`);
      return { success: true };
    }

    // Validate seat number
    const { data: participants } = await supabase
      .from('tournament_participants')
      .select('id')
      .eq('tournament_id', tournamentId);

    const numPlayers = participants?.length || 0;
    if (seatNumber < 1 || seatNumber > numPlayers) {
      return { success: false, message: `Seat number must be between 1 and ${numPlayers}` };
    }

    // Check if seat is already taken by another player
    const { data: existingSeat } = await supabase
      .from('tournament_participants')
      .select('id, player_id')
      .eq('tournament_id', tournamentId)
      .eq('draft_seat', seatNumber)
      .maybeSingle();

    // If seat is taken by a different player, clear it first
    if (existingSeat && existingSeat.player_id !== playerId) {
      await supabase
        .from('tournament_participants')
        .update({ draft_seat: null })
        .eq('tournament_id', tournamentId)
        .eq('player_id', existingSeat.player_id);
    }

    // Clear the player's current seat if they have one (in case they're moving seats)
    await supabase
      .from('tournament_participants')
      .update({ draft_seat: null })
      .eq('tournament_id', tournamentId)
      .eq('player_id', playerId);

    // Assign the new seat
    const { error } = await supabase
      .from('tournament_participants')
      .update({ draft_seat: seatNumber })
      .eq('tournament_id', tournamentId)
      .eq('player_id', playerId);

    if (error) {
      console.error('Error selecting seat:', error);
      return { success: false, message: error.message };
    }

    revalidatePath(`/tournament/${tournamentId}/seating`);
    return { success: true };
  } catch (error) {
    console.error('Error in selectSeat:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}

interface StartDraftResult {
  success: boolean;
  message?: string;
}

interface DeleteTournamentResult {
  success: boolean;
  message?: string;
}

export async function deleteTournament(tournamentId: string): Promise<DeleteTournamentResult> {
  try {
    const supabase = await createClient();

    // Delete tournament (cascade will handle related records)
    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', tournamentId);

    if (error) {
      console.error('Error deleting tournament:', error);
      return { success: false, message: error.message };
    }

    revalidatePath('/tournaments');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error in deleteTournament:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}

export async function startDraft(tournamentId: string): Promise<StartDraftResult> {
  try {
    const supabase = await createClient();

    // Check if matches already exist
    const { data: existingMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .limit(1);

    if (existingMatches && existingMatches.length > 0) {
      return { success: false, message: 'Draft has already started' };
    }

    // Fetch tournament details
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, format')
      .eq('id', tournamentId)
      .single();

    if (!tournament) {
      return { success: false, message: 'Tournament not found' };
    }

    // Fetch all participants with their seats
    const { data: participants } = await supabase
      .from('tournament_participants')
      .select('player_id, draft_seat')
      .eq('tournament_id', tournamentId)
      .order('draft_seat', { ascending: true });

    if (!participants || participants.length < 2) {
      return { success: false, message: 'Not enough participants' };
    }

    // Check that all participants have seats assigned
    const participantsWithoutSeats = participants.filter((p) => p.draft_seat === null);
    if (participantsWithoutSeats.length > 0) {
      return { success: false, message: 'All players must select their seats before starting the draft' };
    }

    // Generate Round 1 pairings based on draft seats
    const numPlayers = participants.length;
    const pairings: Array<{ player1: string; player2?: string }> = [];

    for (let i = 0; i < Math.floor(numPlayers / 2); i++) {
      const seat1 = i + 1;
      const seat2 = i + 1 + Math.floor(numPlayers / 2);
      
      const player1 = participants.find((p) => p.draft_seat === seat1);
      const player2 = participants.find((p) => p.draft_seat === seat2);
      
      if (player1 && player2) {
        pairings.push({ player1: player1.player_id, player2: player2.player_id });
      }
    }

    // Handle bye for odd number of players
    if (numPlayers % 2 === 1) {
      const byeSeat = numPlayers;
      const byePlayer = participants.find((p) => p.draft_seat === byeSeat);
      if (byePlayer) {
        pairings.push({ player1: byePlayer.player_id });
      }
    }

    // Update tournament status to 'active' since Round 1 is starting
    const { error: statusError } = await supabase
      .from('tournaments')
      .update({ status: 'active' })
      .eq('id', tournamentId);

    if (statusError) {
      console.error('Error updating tournament status:', statusError);
      return { success: false, message: 'Failed to update tournament status' };
    }

    // Create matches for Round 1
    for (const pairing of pairings) {
      if (!pairing.player2) {
        // Bye match - player gets automatic win with 2 game wins (standard bye score)
        const { data: match, error: matchError } = await supabase
          .from('matches')
          .insert({
            tournament_id: tournamentId,
            round_number: 1,
            game_type: tournament.format,
          })
          .select()
          .single();

        if (matchError || !match) {
          console.error('Error creating bye match:', matchError);
          return { success: false, message: 'Failed to create bye match' };
        }

        const { error: participantError } = await supabase.from('match_participants').insert({
          match_id: match.id,
          player_id: pairing.player1,
          result: 'win', // Bye is an automatic win
          games_won: 2, // Standard bye score is 2-0
        });

        if (participantError) {
          console.error('Error creating bye participant:', participantError);
          return { success: false, message: 'Failed to create match participant' };
        }
      } else {
        // Normal match
        const { data: match, error: matchError } = await supabase
          .from('matches')
          .insert({
            tournament_id: tournamentId,
            round_number: 1,
            game_type: tournament.format,
          })
          .select()
          .single();

        if (matchError || !match) {
          console.error('Error creating match:', matchError);
          return { success: false, message: 'Failed to create match' };
        }

        const { error: participantsError } = await supabase.from('match_participants').insert([
          {
            match_id: match.id,
            player_id: pairing.player1,
            result: null,
          },
          {
            match_id: match.id,
            player_id: pairing.player2,
            result: null,
          },
        ]);

        if (participantsError) {
          console.error('Error creating match participants:', participantsError);
          return { success: false, message: 'Failed to create match participants' };
        }
      }
    }

    revalidatePath(`/tournament/${tournamentId}`);
    revalidatePath(`/tournament/${tournamentId}/seating`);
    redirect(`/tournament/${tournamentId}`);
  } catch (error) {
    // Re-throw redirect errors
    if (error && typeof error === 'object' && 'digest' in error) {
      const digest = (error as { digest?: string }).digest;
      if (digest?.startsWith('NEXT_REDIRECT')) {
        throw error;
      }
    }

    console.error('Error in startDraft:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}
