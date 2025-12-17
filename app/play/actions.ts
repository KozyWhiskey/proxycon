'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

interface LogCasualMatchResult {
  success: boolean;
  message?: string;
}

interface NewCasualMatchData {
  format: 'commander' | '1v1' | '2hg' | 'ffa' | 'limited';
  playerIds: string[];
  deckIds: Record<string, string>; // Map playerId -> deckId
  winnerIds: string[];
  eventId?: string;
}

export async function logCasualMatch(
  data: NewCasualMatchData
): Promise<LogCasualMatchResult> {
  try {
    const supabase = await createClient();

    // Validate input
    if (data.playerIds.length < 2) {
      return { success: false, message: 'Must have at least 2 players' };
    }
    
    if (data.winnerIds.length === 0) {
        return { success: false, message: 'Must select a winner' };
    }

    // Step 1: Create match entry
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        tournament_id: null,
        round_number: null,
        game_type: data.format,
        event_id: data.eventId || null,
      })
      .select()
      .single();

    if (matchError || !match) {
      console.error('Error creating match:', matchError);
      return { success: false, message: 'Failed to create match' };
    }

    // Step 2: Create match_participants entries
    const participants = data.playerIds.map((playerId) => {
      const isWinner = data.winnerIds.includes(playerId);
      const deckId = data.deckIds[playerId] || null;
      
      return {
        match_id: match.id,
        player_id: playerId,
        result: isWinner ? 'win' : 'loss',
        deck_id: deckId,
        games_won: isWinner ? 1 : 0 // Simple boolean win for casual
      };
    });

    const { error: participantsError } = await supabase
      .from('match_participants')
      .insert(participants);

    if (participantsError) {
      console.error('Error creating match participants:', participantsError);
      return { success: false, message: 'Failed to create match participants' };
    }

    // Step 3: Update wins for winners (Legacy 'players' table support)
    for (const winnerId of data.winnerIds) {
        const { data: player } = await supabase
          .from('players')
          .select('wins')
          .eq('id', winnerId)
          .single();

        if (player) {
          const newWins = (player.wins || 0) + 1;
          await supabase
            .from('players')
            .update({ wins: newWins })
            .eq('id', winnerId);
        }
    }

    // Step 4: Revalidate
    revalidatePath('/');
    // We do NOT redirect here to allow the client to handle it (show toast, then redirect)
    return { success: true };
  } catch (error) {
    console.error('Error in logCasualMatch:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}