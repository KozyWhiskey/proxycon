'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

interface AdminActionResult {
  success: boolean;
  message?: string;
}

export async function fixMatchResult(
  matchId: string,
  newWinnerId: string
): Promise<AdminActionResult> {
  try {
    const supabase = await createClient();

    // Step 1: Get current match participants
    const { data: participants, error: participantsError } = await supabase
      .from('match_participants')
      .select('player_id, result')
      .eq('match_id', matchId);

    if (participantsError || !participants || participants.length === 0) {
      return { success: false, message: 'Match not found or has no participants' };
    }

    // Validate new winner is in the match
    const participantIds = participants.map((p) => p.player_id);
    if (!participantIds.includes(newWinnerId)) {
      return { success: false, message: 'New winner must be a participant in this match' };
    }

    // Step 2: Get current winner (if any)
    const currentWinner = participants.find((p) => p.result === 'win' || p.result === '1st');

    // Step 3: Update match participants
    // Set new winner
    const { error: winnerError } = await supabase
      .from('match_participants')
      .update({ result: currentWinner?.result === '1st' ? '1st' : 'win' })
      .eq('match_id', matchId)
      .eq('player_id', newWinnerId);

    if (winnerError) {
      return { success: false, message: `Failed to update winner: ${winnerError.message}` };
    }

    // Set all others as losers (or ranked positions if it was ranked)
    for (const participant of participants) {
      if (participant.player_id === newWinnerId) continue;

      let newResult: string;
      if (currentWinner?.result === '1st') {
        // Was ranked, keep ranked format
        const currentPosition = participant.result;
        if (currentPosition === '1st') {
          newResult = '2nd'; // Old winner becomes 2nd
        } else if (currentPosition === '2nd') {
          newResult = '3rd';
        } else if (currentPosition === '3rd') {
          newResult = '4th';
        } else {
          newResult = '4th';
        }
      } else {
        // Was simple win/loss
        newResult = 'loss';
      }

      await supabase
        .from('match_participants')
        .update({ result: newResult })
        .eq('match_id', matchId)
        .eq('player_id', participant.player_id);
    }

    // Step 4: Update player wins/losses
    // Decrement wins for old winner (if exists)
    if (currentWinner && currentWinner.player_id !== newWinnerId) {
      const { data: oldWinner } = await supabase
        .from('players')
        .select('wins')
        .eq('id', currentWinner.player_id)
        .single();

      if (oldWinner && oldWinner.wins > 0) {
        await supabase
          .from('players')
          .update({ wins: oldWinner.wins - 1 })
          .eq('id', currentWinner.player_id);
      }
    }

    // Increment wins for new winner
    const { data: newWinner } = await supabase
      .from('players')
      .select('wins')
      .eq('id', newWinnerId)
      .single();

    if (newWinner) {
      await supabase
        .from('players')
        .update({ wins: (newWinner.wins || 0) + 1 })
        .eq('id', newWinnerId);
    }

    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true, message: 'Match result updated successfully' };
  } catch (error) {
    console.error('Error in fixMatchResult:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}

export async function fixMatchResultWithGames(
  matchId: string,
  player1Id: string,
  player2Id: string,
  player1Games: number,
  player2Games: number
): Promise<AdminActionResult> {
  try {
    const supabase = await createClient();

    // Step 1: Get current match participants
    const { data: participants, error: participantsError } = await supabase
      .from('match_participants')
      .select('player_id, result')
      .eq('match_id', matchId);

    if (participantsError || !participants || participants.length < 2) {
      return { success: false, message: 'Match not found or has insufficient participants' };
    }

    // Validate players are in the match
    const participantIds = participants.map((p) => p.player_id);
    if (!participantIds.includes(player1Id) || !participantIds.includes(player2Id)) {
      return { success: false, message: 'Players must be participants in this match' };
    }

    // Get current winner for player wins adjustment
    const currentWinner = participants.find((p) => p.result === 'win');

    // Determine new result based on game scores
    let player1Result: string;
    let player2Result: string;

    if (player1Games === player2Games) {
      // Draw
      player1Result = 'draw';
      player2Result = 'draw';
    } else if (player1Games > player2Games) {
      // Player 1 wins
      player1Result = 'win';
      player2Result = 'loss';
    } else {
      // Player 2 wins
      player1Result = 'loss';
      player2Result = 'win';
    }

    // Step 2: Update match participants with results and games_won
    const { error: player1Error } = await supabase
      .from('match_participants')
      .update({ result: player1Result, games_won: player1Games })
      .eq('match_id', matchId)
      .eq('player_id', player1Id);

    if (player1Error) {
      return { success: false, message: `Failed to update player 1: ${player1Error.message}` };
    }

    const { error: player2Error } = await supabase
      .from('match_participants')
      .update({ result: player2Result, games_won: player2Games })
      .eq('match_id', matchId)
      .eq('player_id', player2Id);

    if (player2Error) {
      return { success: false, message: `Failed to update player 2: ${player2Error.message}` };
    }

    // Step 3: Update player wins count
    const newWinnerId = player1Result === 'win' ? player1Id : player2Result === 'win' ? player2Id : null;

    // If there was a previous winner and it's different from the new winner, decrement old winner's wins
    if (currentWinner && currentWinner.player_id !== newWinnerId) {
      const { data: oldWinner } = await supabase
        .from('players')
        .select('wins')
        .eq('id', currentWinner.player_id)
        .single();

      if (oldWinner && oldWinner.wins > 0) {
        await supabase
          .from('players')
          .update({ wins: oldWinner.wins - 1 })
          .eq('id', currentWinner.player_id);
      }
    }

    // If there's a new winner (not a draw) and they weren't the previous winner, increment their wins
    if (newWinnerId && (!currentWinner || currentWinner.player_id !== newWinnerId)) {
      const { data: newWinner } = await supabase
        .from('players')
        .select('wins')
        .eq('id', newWinnerId)
        .single();

      if (newWinner) {
        await supabase
          .from('players')
          .update({ wins: (newWinner.wins || 0) + 1 })
          .eq('id', newWinnerId);
      }
    }

    // Generate result message
    let resultMessage: string;
    if (player1Games === player2Games) {
      resultMessage = `Match updated: Draw ${player1Games}-${player2Games}`;
    } else if (player1Games > player2Games) {
      resultMessage = `Match updated: Player 1 wins ${player1Games}-${player2Games}`;
    } else {
      resultMessage = `Match updated: Player 2 wins ${player2Games}-${player1Games}`;
    }

    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true, message: resultMessage };
  } catch (error) {
    console.error('Error in fixMatchResultWithGames:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}

export async function addPlayer(data: {
  name: string;
  nickname: string | null;
  avatar_url: string | null;
  color: string | null;
}): Promise<AdminActionResult> {
  try {
    const supabase = await createClient();

    if (!data.name || !data.name.trim()) {
      return { success: false, message: 'Player name is required' };
    }

    // Build insert object, conditionally include color if it's provided
    const insertData: any = {
      name: data.name.trim(),
      nickname: data.nickname?.trim() || null,
      avatar_url: data.avatar_url?.trim() || null,
      wins: 0,
    };

    // Only include color if it's provided (column might not exist yet)
    if (data.color?.trim()) {
      insertData.color = data.color.trim();
    }

    const { error } = await supabase.from('players').insert(insertData);

    if (error) {
      if (error.message.includes('column') && error.message.includes('color')) {
        return {
          success: false,
          message:
            'Player color column is missing. Run .dev-docs/DATABASE_MIGRATION_add_player_color.md in Supabase, then try again.',
        };
      }
      return { success: false, message: `Failed to add player: ${error.message}` };
    }

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/login');
    return { success: true, message: `Player "${data.name}" added successfully` };
  } catch (error) {
    console.error('Error in addPlayer:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}

export async function updatePlayer(
  playerId: string,
  data: {
    name: string;
    nickname: string | null;
    avatar_url: string | null;
    color: string | null;
  }
): Promise<AdminActionResult> {
  try {
    const supabase = await createClient();

    if (!data.name || !data.name.trim()) {
      return { success: false, message: 'Player name is required' };
    }

    // Build update object - always include color so admins can clear it
    const updateData: any = {
      name: data.name.trim(),
      nickname: data.nickname?.trim() || null,
      avatar_url: data.avatar_url?.trim() || null,
      color: data.color?.trim() || null,
    };

    const { error } = await supabase
      .from('players')
      .update(updateData)
      .eq('id', playerId);

    if (error) {
      if (error.message.includes('column') && error.message.includes('color')) {
        return {
          success: false,
          message:
            'Player color column is missing. Run .dev-docs/DATABASE_MIGRATION_add_player_color.md in Supabase, then try again.',
        };
      }
      return { success: false, message: `Failed to update player: ${error.message}` };
    }

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/login');
    return { success: true, message: 'Player updated successfully' };
  } catch (error) {
    console.error('Error in updatePlayer:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}

export async function deletePlayer(playerId: string): Promise<AdminActionResult> {
  try {
    const supabase = await createClient();

    // Get player name for message
    const { data: player } = await supabase
      .from('players')
      .select('name, nickname')
      .eq('id', playerId)
      .single();

    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    // Delete player (cascade will handle related records if foreign keys are set up)
    // Note: This will fail if there are foreign key constraints without CASCADE
    const { error } = await supabase.from('players').delete().eq('id', playerId);

    if (error) {
      // Check if it's a foreign key constraint error
      if (error.message.includes('foreign key') || error.message.includes('constraint')) {
        return {
          success: false,
          message:
            'Cannot delete player: They have tournament or match records. Delete those first or contact support.',
        };
      }
      return { success: false, message: `Failed to delete player: ${error.message}` };
    }

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/login');
    return {
      success: true,
      message: `Player "${player.nickname || player.name}" deleted successfully`,
    };
  } catch (error) {
    console.error('Error in deletePlayer:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}
