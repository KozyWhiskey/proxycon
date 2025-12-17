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
  profileIds: string[]; // Changed from playerIds to profileIds
  deckIds: Record<string, string>; // Map profileId -> deckId
  winnerProfileIds: string[]; // Changed from winnerIds to winnerProfileIds
  eventId?: string;
}

export async function logCasualMatch(
  data: NewCasualMatchData
): Promise<LogCasualMatchResult> {
  try {
    const supabase = await createClient();

    // Validate input
    if (data.profileIds.length < 2) {
      return { success: false, message: 'Must have at least 2 profiles' };
    }
    
    if (data.winnerProfileIds.length === 0) {
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
    const participants = data.profileIds.map((profileId) => {
      const isWinner = data.winnerProfileIds.includes(profileId);
      const deckId = data.deckIds[profileId] || null;
      
      return {
        match_id: match.id,
        profile_id: profileId, // Changed to profile_id
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

    // Step 3: Remove legacy 'players' table win update.
    // Global wins will be calculated directly from match_participants on the dashboard.

    // Step 4: Revalidate
    revalidatePath('/');
    if (data.eventId) {
      revalidatePath(`/events/${data.eventId}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Error in logCasualMatch:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}