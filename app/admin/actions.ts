'use server';

import { createClient } from '@/utils/supabase/server';
import { reportMatch } from '@/app/weekend/actions';
import { revalidatePath } from 'next/cache';
import { Profile, Event } from '@/lib/types';
import { Badge, awardBadge as awardBadgeInternal } from '@/lib/badges';

interface AdminActionResult {
  success: boolean;
  message?: string;
}


async function adminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) throw new Error('Administrator access required.');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') throw new Error('Administrator access required.');
  return supabase;
}

// --- USER MANAGEMENT ---

export async function getUsers(): Promise<{ success: boolean; data?: Profile[]; message?: string }> {
  try {
    const supabase = await adminClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, data: data as Profile[] };
  } catch {
    return { success: false, message: 'Failed to fetch users' };
  }
}

export async function updateUserRole(userId: string, role: 'user' | 'admin'): Promise<AdminActionResult> {
  if (role !== 'user' && role !== 'admin') return { success: false, message: 'Choose a valid role.' };
  try {
    const supabase = await createClient();
    
    // Check if current user is admin (security check)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.is_anonymous) return { success: false, message: 'Administrator access required.' };

    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (role === 'user' && userId === user.id) return { success: false, message: 'Keep your own administrator access.' };

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
  } catch {
    return { success: false, message: 'Failed to update user role' };
  }
}

// --- EVENT MANAGEMENT ---

export async function getEvents(): Promise<{ success: boolean; data?: Event[]; message?: string }> {
  try {
    const supabase = await adminClient();
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, data: data as Event[] };
  } catch {
    return { success: false, message: 'Failed to fetch events' };
  }
}

export async function updateEvent(eventId: string, data: Partial<Event>): Promise<AdminActionResult> {
  try {
    const supabase = await adminClient();
    const { error } = await supabase
      .from('events')
      .update({ ...(typeof data.is_active === 'boolean' ? { is_active: data.is_active } : {}) })
      .eq('id', eventId);

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/events');
    revalidatePath('/');
    revalidatePath(`/events/${eventId}`);
    return { success: true, message: 'Event updated' };
  } catch {
    return { success: false, message: 'Failed to update event' };
  }
}

// --- MATCH MANAGEMENT (Existing Logic) ---

export async function fixMatchResult(matchId: string, newWinnerId: string): Promise<AdminActionResult> {
  try {
    await adminClient();
    return await reportMatch({ matchId, winnerIds: [newWinnerId] });
  } catch {
    return { success: false, message: 'Could not replace this result. Check your access and try again.' };
  }
}

export async function fixMatchResultWithGames(matchId: string, player1Id: string, player2Id: string, player1Games: number, player2Games: number): Promise<AdminActionResult> {
  try {
    const supabase = await adminClient();
    if (player1Id === player2Id || ![player1Games, player2Games].every(score => Number.isInteger(score) && score >= 0) || player1Games + player2Games === 0) return { success: false, message: 'Enter games won for two different players.' };
    const { data: seats } = await supabase.from('match_participants').select('profile_id').eq('match_id', matchId);
    if (seats?.length !== 2 || !seats.some(p => p.profile_id === player1Id) || !seats.some(p => p.profile_id === player2Id)) return { success: false, message: 'Use the event scoring controls for this game.' };
    return await reportMatch({ matchId, games: { [player1Id]: player1Games, [player2Id]: player2Games } });
  } catch {
    return { success: false, message: 'Could not replace this result. Check your access and try again.' };
  }
}

// --- BADGE MANAGEMENT ---

export async function getAllBadges(): Promise<{ success: boolean; data?: Badge[]; message?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('badges').select('*').order('name');
    if (error) return { success: false, message: error.message };
    return { success: true, data: data as Badge[] };
  } catch {
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
  } catch {
    return { success: false, message: 'Error awarding badge' };
  }
}

export async function searchUsers(query: string): Promise<{ success: boolean; data?: { id: string; username: string; display_name: string | null; avatar_url: string | null }[]; message?: string }> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
            .limit(10);
        
        if (error) return { success: false, message: error.message };
        return { success: true, data };
    } catch {
        return { success: false, message: 'Search failed' };
    }
}