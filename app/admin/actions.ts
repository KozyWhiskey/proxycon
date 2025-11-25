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
    const currentLosers = participants.filter(
      (p) => p.result === 'loss' || p.result === '2nd' || p.result === '3rd' || p.result === '4th'
    );

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

export async function adjustTickets(
  playerId: string,
  amount: number
): Promise<AdminActionResult> {
  try {
    const supabase = await createClient();

    // Get current tickets
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('tickets, name')
      .eq('id', playerId)
      .single();

    if (playerError || !player) {
      return { success: false, message: 'Player not found' };
    }

    const newTickets = Math.max(0, (player.tickets || 0) + amount);

    const { error: updateError } = await supabase
      .from('players')
      .update({ tickets: newTickets })
      .eq('id', playerId);

    if (updateError) {
      return { success: false, message: `Failed to update tickets: ${updateError.message}` };
    }

    revalidatePath('/');
    revalidatePath('/admin');
    return {
      success: true,
      message: `Updated ${player.name}'s tickets by ${amount > 0 ? '+' : ''}${amount}. New total: ${newTickets}`,
    };
  } catch (error) {
    console.error('Error in adjustTickets:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}

export async function deleteLastExpense(): Promise<AdminActionResult> {
  try {
    const supabase = await createClient();

    // Get the most recent ledger entry
    const { data: lastEntry, error: fetchError } = await supabase
      .from('ledger')
      .select('id, description, amount')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !lastEntry) {
      return { success: false, message: 'No ledger entries found' };
    }

    // Delete it
    const { error: deleteError } = await supabase
      .from('ledger')
      .delete()
      .eq('id', lastEntry.id);

    if (deleteError) {
      return { success: false, message: `Failed to delete entry: ${deleteError.message}` };
    }

    revalidatePath('/ledger');
    revalidatePath('/admin');
    return {
      success: true,
      message: `Deleted last expense: ${lastEntry.description} ($${lastEntry.amount})`,
    };
  } catch (error) {
    console.error('Error in deleteLastExpense:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}

export async function addPlayer(data: {
  name: string;
  nickname: string | null;
  avatar_url: string | null;
}): Promise<AdminActionResult> {
  try {
    const supabase = await createClient();

    if (!data.name || !data.name.trim()) {
      return { success: false, message: 'Player name is required' };
    }

    const { error } = await supabase.from('players').insert({
      name: data.name.trim(),
      nickname: data.nickname?.trim() || null,
      avatar_url: data.avatar_url?.trim() || null,
      wins: 0,
      tickets: 0,
    });

    if (error) {
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
  }
): Promise<AdminActionResult> {
  try {
    const supabase = await createClient();

    if (!data.name || !data.name.trim()) {
      return { success: false, message: 'Player name is required' };
    }

    const { error } = await supabase
      .from('players')
      .update({
        name: data.name.trim(),
        nickname: data.nickname?.trim() || null,
        avatar_url: data.avatar_url?.trim() || null,
      })
      .eq('id', playerId);

    if (error) {
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

