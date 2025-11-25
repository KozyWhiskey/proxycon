'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Swiss } from 'tournament-pairings';

interface CreateTournamentResult {
  success: boolean;
  message?: string;
  tournamentId?: string;
}

export async function createTournament(
  name: string,
  playerIds: string[],
  format: string = 'draft',
  maxRounds: number = 3
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

    // Step 1: Create tournament entry
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .insert({
        name: name.trim(),
        format,
        status: 'active',
        max_rounds: maxRounds,
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

    // Step 2: Generate pairings using tournament-pairings library
    // For round 1, we use random pairings (no previous results)
    // Swiss constructor takes standings with id, wins, losses, draws
    // For round 1, all players start with 0 wins/losses/draws
    const standings = playerIds.map((id) => ({ id, wins: 0, losses: 0, draws: 0 }));
    const pairings = new Swiss(standings);

    // Step 3 & 4: Create matches and match_participants
    // The pairings array contains objects with player1 and player2 properties
    for (const pairing of pairings) {
      // Check if this is a bye (only player1 exists, player2 is undefined/null)
      if (!pairing.player2) {
        // Create a match with only one participant (bye)
        const { data: match, error: matchError } = await supabase
          .from('matches')
          .insert({
            tournament_id: tournament.id,
            round_number: 1,
            game_type: format,
          })
          .select()
          .single();

        if (matchError || !match) {
          console.error('Error creating bye match:', matchError);
          return { 
            success: false, 
            message: matchError?.message || 'Failed to create bye match' 
          };
        }

        // Create match participant with automatic win for bye
        const { error: participantError } = await supabase.from('match_participants').insert({
          match_id: match.id,
          player_id: pairing.player1,
          result: 'win', // Bye is an automatic win
        });

        if (participantError) {
          console.error('Error creating bye participant:', participantError);
          return { success: false, message: `Failed to create match participant: ${participantError.message}` };
        }
      } else {
        // Normal match with two players
        const { data: match, error: matchError } = await supabase
          .from('matches')
          .insert({
            tournament_id: tournament.id,
            round_number: 1,
            game_type: format,
          })
          .select()
          .single();

        if (matchError || !match) {
          console.error('Error creating match:', matchError);
          return { 
            success: false, 
            message: matchError?.message || 'Failed to create match' 
          };
        }

        // Create match participants (both start with null result)
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
          return { success: false, message: `Failed to create match participants: ${participantsError.message}` };
        }
      }
    }

    // Step 5: Redirect to tournament bracket page
    redirect(`/tournament/${tournament.id}`);
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

interface SubmitResultResult {
  success: boolean;
  message?: string;
  nextRoundGenerated?: boolean;
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

    // Step 1: Fetch standings for all players in this tournament
    const { data: allMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .lte('round_number', currentRound);

    if (!allMatches || allMatches.length === 0) {
      console.error('No matches found for tournament');
      return;
    }

    const matchIds = allMatches.map((m) => m.id);
    const { data: allParticipants } = await supabase
      .from('match_participants')
      .select('player_id, result')
      .in('match_id', matchIds);

    // Calculate standings
    const standingsMap = new Map<string, { wins: number; losses: number; draws: number }>();

    allParticipants?.forEach((p) => {
      if (!standingsMap.has(p.player_id)) {
        standingsMap.set(p.player_id, { wins: 0, losses: 0, draws: 0 });
      }

      const standing = standingsMap.get(p.player_id)!;
      if (p.result === 'win') {
        standing.wins++;
      } else if (p.result === 'loss') {
        standing.losses++;
      } else if (p.result === 'draw') {
        standing.draws++;
      }
    });

    // Convert to array format for Swiss pairing
    const standings = Array.from(standingsMap.entries()).map(([id, stats]) => ({
      id,
      ...stats,
    }));

    if (standings.length < 2) {
      console.error('Not enough players for next round');
      return;
    }

    // Step 2: Generate pairings for next round
    const nextRound = currentRound + 1;
    const pairings = new Swiss(standings);

    // Step 3: Create matches and match_participants for next round
    for (const pairing of pairings) {
      if (!pairing.player2) {
        // Bye
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

