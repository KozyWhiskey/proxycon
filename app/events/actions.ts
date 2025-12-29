'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { randomBytes } from 'crypto';

function generateInviteCode(): string {
  return randomBytes(3).toString('hex').toUpperCase(); // 6 chars
}

export interface CreateEventResult {
  success: boolean;
  message?: string;
  eventId?: string;
}

export async function createEvent(
  name: string,
  startDate?: string,
  endDate?: string,
  organizationId?: string | null
): Promise<CreateEventResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Not authenticated' };
  }

  const inviteCode = generateInviteCode();

  // 1. Create the event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      owner_id: user.id,
      name,
      start_date: startDate || null,
      end_date: endDate || null,
      invite_code: inviteCode,
      is_active: true,
      organization_id: organizationId || null, // Link to Guild
    })
    .select()
    .single();

  if (eventError || !event) {
    console.error('Error creating event:', eventError);
    return { success: false, message: eventError?.message || 'Failed to create event' };
  }

  // 2. Add creator as owner
  const { error: participantError } = await supabase
    .from('event_members')
    .insert({
      event_id: event.id,
      profile_id: user.id,
      role: 'owner',
    });

  if (participantError) {
    console.error('Error adding participant:', participantError);
    // Should probably delete the event or handle cleanup, but for now just error
    return { success: false, message: 'Event created but failed to join as admin.' };
  }

  revalidatePath('/');
  return { success: true, eventId: event.id };
}

export async function joinEvent(inviteCode: string): Promise<CreateEventResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Not authenticated' };
  }

  // 1. Find event by code
  const { data: event, error: findError } = await supabase
    .from('events')
    .select('id')
    .eq('invite_code', inviteCode.toUpperCase())
    .single();

  if (findError || !event) {
    return { success: false, message: 'Invalid invite code' };
  }

  // 2. Check if already joined
  const { data: existing } = await supabase
    .from('event_members')
    .select('event_id')
    .eq('event_id', event.id)
    .eq('profile_id', user.id)
    .single();

  if (existing) {
    return { success: true, eventId: event.id, message: 'Already joined' };
  }

  // 3. Join
  const { error: joinError } = await supabase
    .from('event_members')
    .insert({
      event_id: event.id,
      profile_id: user.id,
      role: 'player',
    });

  if (joinError) {
    return { success: false, message: joinError.message };
  }

  revalidatePath('/');
  return { success: true, eventId: event.id };
}

export async function searchProfiles(query: string) {
  const supabase = await createClient();
  
  if (!query || query.length < 2) return [];

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(10);

  if (error) {
    console.error('Error searching profiles:', error);
    return [];
  }

  return profiles || [];
}

export async function addEventMember(eventId: string, profileId: string) {
  const supabase = await createClient();
  
  // Check if already a member
  const { data: existing } = await supabase
    .from('event_members')
    .select('event_id')
    .eq('event_id', eventId)
    .eq('profile_id', profileId)
    .single();

  if (existing) {
    return { success: false, message: 'User is already a member of this event.' };
  }

  const { error } = await supabase
    .from('event_members')
    .insert({
      event_id: eventId,
      profile_id: profileId,
      role: 'player', // Default role
    });

  if (error) {
    console.error('Error adding member:', error);
    return { success: false, message: 'Failed to add member.' };
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function removeEventMember(eventId: string, profileId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('event_members')
    .delete()
    .eq('event_id', eventId)
    .eq('profile_id', profileId);

  if (error) {
    console.error('Error removing member:', error);
    return { success: false, message: 'Failed to remove member.' };
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function getEventMembers(eventId: string) {
  const supabase = await createClient();

  const { data: members, error } = await supabase
    .from('event_members')
    .select(`
      role,
      joined_at,
      profile:profiles (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('event_id', eventId);

  if (error) {
    console.error('Error fetching members:', error);
    return [];
  }

  // Flatten the structure for easier consumption
  return members.map((m: any) => {
    const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
    return {
      id: profile?.id,
      username: profile?.username,
      display_name: profile?.display_name,
      avatar_url: profile?.avatar_url,
      role: m.role,
      joined_at: m.joined_at,
    };
  });
}
