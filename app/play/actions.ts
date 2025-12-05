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
  boardGameName?: string;
  playerIds: string[];
  outcomeType: 'simple' | 'ranked';
  results: {
    playerId: string;
    result: 'win' | 'loss' | '1st' | '2nd' | '3rd' | '4th';
  }[];
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

    const boardGameName = data.boardGameName?.trim() || null;

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
        notes: data.gameType === 'board_game' ? boardGameName : null,
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

    // Step 3: Update wins for winners
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

    // Step 4: Revalidate and redirect
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
