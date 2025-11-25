'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

interface LogCasualMatchResult {
  success: boolean;
  message?: string;
}

interface CasualMatchData {
  gameType: 'commander' | 'board_game';
  playerIds: string[];
  outcomeType: 'simple' | 'ranked';
  results: {
    playerId: string;
    result: 'win' | 'loss' | '1st' | '2nd' | '3rd' | '4th';
  }[];
  achievements?: string[]; // Array of achievement names (e.g., 'first_blood', 'eliminated_player', 'salt_penalty')
}

/**
 * Calculates ticket rewards based on outcome and achievements
 */
function calculateTickets(
  result: 'win' | 'loss' | '1st' | '2nd' | '3rd' | '4th',
  achievements: string[] = []
): number {
  let tickets = 0;

  // Base tickets from outcome
  if (result === 'win') {
    tickets = 3;
  } else if (result === 'loss') {
    tickets = 0;
  } else if (result === '1st') {
    tickets = 5;
  } else if (result === '2nd') {
    tickets = 3;
  } else if (result === '3rd') {
    tickets = 2;
  } else if (result === '4th') {
    tickets = 1;
  }

  // Achievement bonuses
  achievements.forEach((achievement) => {
    if (achievement === 'first_blood') {
      tickets += 1;
    } else if (achievement === 'eliminated_player') {
      tickets += 1;
    } else if (achievement === 'salt_penalty') {
      tickets -= 1;
    }
  });

  return tickets;
}

export async function logCasualMatch(
  data: CasualMatchData
): Promise<LogCasualMatchResult> {
  try {
    const supabase = await createClient();

    // Validate input
    if (data.playerIds.length < 2 || data.playerIds.length > 4) {
      return { success: false, message: 'Must have between 2 and 4 players' };
    }

    if (data.results.length !== data.playerIds.length) {
      return { success: false, message: 'Results must match number of players' };
    }

    // Validate that all player IDs in results exist in playerIds
    const resultPlayerIds = new Set(data.results.map((r) => r.playerId));
    const inputPlayerIds = new Set(data.playerIds);
    
    if (resultPlayerIds.size !== inputPlayerIds.size) {
      return { success: false, message: 'Results must include all players' };
    }

    for (const result of data.results) {
      if (!inputPlayerIds.has(result.playerId)) {
        return { success: false, message: 'Invalid player in results' };
      }
    }

    // Step 1: Create match entry (tournament_id and round_number are NULL for casual)
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        tournament_id: null,
        round_number: null,
        game_type: data.gameType,
      })
      .select()
      .single();

    if (matchError || !match) {
      console.error('Error creating match:', matchError);
      return { success: false, message: 'Failed to create match' };
    }

    // Step 2: Create match_participants entries
    const participants = data.results.map((result) => ({
      match_id: match.id,
      player_id: result.playerId,
      result: result.result,
    }));

    const { error: participantsError } = await supabase
      .from('match_participants')
      .insert(participants);

    if (participantsError) {
      console.error('Error creating match participants:', participantsError);
      return { success: false, message: 'Failed to create match participants' };
    }

    // Step 3: Update tickets for each player
    // Only winners (1st place in ranked, or win in simple) get achievements applied
    for (const result of data.results) {
      const isWinner = result.result === 'win' || result.result === '1st';
      const achievementsToApply = isWinner ? (data.achievements || []) : [];

      const ticketChange = calculateTickets(result.result, achievementsToApply);

      if (ticketChange !== 0) {
        // Use RPC or update with increment
        // For now, we'll fetch current tickets and update
        const { data: player } = await supabase
          .from('players')
          .select('tickets')
          .eq('id', result.playerId)
          .single();

        if (player) {
          const newTickets = Math.max(0, (player.tickets || 0) + ticketChange);

          const { error: updateError } = await supabase
            .from('players')
            .update({ tickets: newTickets })
            .eq('id', result.playerId);

          if (updateError) {
            console.error(
              `Error updating tickets for player ${result.playerId}:`,
              updateError
            );
            // Continue with other players even if one fails
          }
        }
      }
    }

    // Step 4: Update wins for winners
    for (const result of data.results) {
      if (result.result === 'win' || result.result === '1st') {
        const { data: player } = await supabase
          .from('players')
          .select('wins')
          .eq('id', result.playerId)
          .single();

        if (player) {
          const newWins = (player.wins || 0) + 1;

          await supabase
            .from('players')
            .update({ wins: newWins })
            .eq('id', result.playerId);
        }
      }
    }

    // Step 5: Revalidate and redirect
    revalidatePath('/');
    redirect('/');
  } catch (error) {
    // Re-throw redirect errors
    if (error && typeof error === 'object' && 'digest' in error) {
      const digest = (error as { digest?: string }).digest;
      if (digest?.startsWith('NEXT_REDIRECT')) {
        throw error;
      }
    }

    console.error('Error in logCasualMatch:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}

