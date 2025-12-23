'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { Profile, Event } from '@/lib/types';
import { Badge, awardBadge as awardBadgeInternal } from '@/lib/badges';

interface AdminActionResult {
  success: boolean;
  message?: string;
}

// --- USER MANAGEMENT ---

export async function getUsers(): Promise<{ success: boolean; data?: Profile[]; message?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, data: data as Profile[] };
  } catch (error) {
    return { success: false, message: 'Failed to fetch users' };
  }
}

export async function updateUserRole(userId: string, role: 'user' | 'admin'): Promise<AdminActionResult> {
  try {
    const supabase = await createClient();
    
    // Check if current user is admin (security check)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Not authenticated' };

    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (currentUserProfile?.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath('/admin');
    return { success: true, message: 'User role updated' };
  } catch (error) {
    return { success: false, message: 'Failed to update user role' };
  }
}

// --- EVENT MANAGEMENT ---

export async function getEvents(): Promise<{ success: boolean; data?: Event[]; message?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, data: data as Event[] };
  } catch (error) {
    return { success: false, message: 'Failed to fetch events' };
  }
}

export async function updateEvent(eventId: string, data: Partial<Event>): Promise<AdminActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('events')
      .update(data)
      .eq('id', eventId);

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/events');
    return { success: true, message: 'Event updated' };
  } catch (error) {
    return { success: false, message: 'Failed to update event' };
  }
}

// --- MATCH MANAGEMENT (Existing Logic) ---

export async function fixMatchResult(
  matchId: string,
  newWinnerId: string // profile_id
): Promise<AdminActionResult> {
  try {
    const supabase = await createClient();

    // Step 1: Get current match participants
    const { data: participants, error: participantsError } = await supabase
      .from('match_participants')
      .select('profile_id, result')
      .eq('match_id', matchId);

    if (participantsError || !participants || participants.length === 0) {
      return { success: false, message: 'Match not found or has no participants' };
    }

    // Validate new winner is in the match
    const participantIds = participants.map((p) => p.profile_id);
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
      .eq('profile_id', newWinnerId);

    if (winnerError) {
      return { success: false, message: `Failed to update winner: ${winnerError.message}` };
    }

    // Set all others as losers (or ranked positions if it was ranked)
    for (const participant of participants) {
      if (participant.profile_id === newWinnerId) continue;

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
        .eq('profile_id', participant.profile_id);
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
  player1Id: string, // profile_id
  player2Id: string, // profile_id
  player1Games: number,
  player2Games: number
): Promise<AdminActionResult> {
  try {
    const supabase = await createClient();

    // Step 1: Get current match participants
    const { data: participants, error: participantsError } = await supabase
      .from('match_participants')
      .select('profile_id, result')
      .eq('match_id', matchId);

    if (participantsError || !participants || participants.length < 2) {
      return { success: false, message: 'Match not found or has insufficient participants' };
    }

    // Validate players are in the match
    const participantIds = participants.map((p) => p.profile_id);
    if (!participantIds.includes(player1Id) || !participantIds.includes(player2Id)) {
      return { success: false, message: 'Players must be participants in this match' };
    }

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
      .eq('profile_id', player1Id);

    if (player1Error) {
      return { success: false, message: `Failed to update player 1: ${player1Error.message}` };
    }

    const { error: player2Error } = await supabase
      .from('match_participants')
      .update({ result: player2Result, games_won: player2Games })
      .eq('match_id', matchId)
      .eq('profile_id', player2Id);

    if (player2Error) {
      return { success: false, message: `Failed to update player 2: ${player2Error.message}` };
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

// --- BADGE MANAGEMENT ---

export async function getAllBadges(): Promise<{ success: boolean; data?: Badge[]; message?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('badges').select('*').order('name');
    if (error) return { success: false, message: error.message };
    return { success: true, data: data as Badge[] };
  } catch (error) {
    return { success: false, message: 'Failed to fetch badges' };
  }
}

export async function awardBadgeManually(userId: string, badgeSlug: string): Promise<AdminActionResult> {
  try {
    const supabase = await createClient();
    
    // Check admin (re-verify for security in this specific action)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Not authenticated' };

    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (currentUserProfile?.role !== 'admin') {
      return { success: false, message: 'Unauthorized' };
    }

    // Award badge (globally, so eventId = null)
    const result = await awardBadgeInternal(supabase, userId, badgeSlug, null);
    
    if (!result) return { success: false, message: 'Failed to award badge (already owned or invalid slug)' };

    revalidatePath('/admin');
    return { success: true, message: 'Badge awarded' };
  } catch (error) {
    return { success: false, message: 'Error awarding badge' };
  }
}

export async function searchUsers(query: string): Promise<{ success: boolean; data?: any[]; message?: string }> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
            .limit(10);
        
        if (error) return { success: false, message: error.message };
        return { success: true, data };
    } catch (e) {
        return { success: false, message: 'Search failed' };
    }
}