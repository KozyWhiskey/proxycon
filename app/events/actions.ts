'use server';

import { createClient } from '@/utils/supabase/server';
import { resolvePlayer } from '@/lib/player-session';
import { revalidatePath } from 'next/cache';
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
  const ctx = await resolvePlayer();
  if (!ctx.playerId) return { success: false, message: 'Choose your name first.' };
  const supabase = ctx.supabase;

  if (!name.trim()) return { success: false, message: 'Give the event a name.' };
  if (!startDate || !endDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || !Number.isFinite(Date.parse(startDate)) || !Number.isFinite(Date.parse(endDate)) || endDate < startDate) return { success: false, message: 'Choose a start date and an end date on or after it.' };

  const inviteCode = generateInviteCode();

  // 1. Create the event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      owner_id: ctx.playerId,
      name: name.trim(),
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
      profile_id: ctx.playerId,
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
  const ctx = await resolvePlayer();
  if (!ctx.playerId) return { success: false, message: 'Choose your name first.' };
  const supabase = ctx.supabase;

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
    .eq('profile_id', ctx.playerId)
    .single();

  if (existing) {
    return { success: true, eventId: event.id, message: 'Already joined' };
  }

  // 3. Join
  const { error: joinError } = await supabase
    .from('event_members')
    .insert({
      event_id: event.id,
      profile_id: ctx.playerId,
      role: 'player',
    });

  if (joinError && joinError.code !== '23505') {
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
  const ctx = await resolvePlayer();
  if (!ctx.authUser) return { success: false, message: 'Sign in first.' };
  const supabase = ctx.supabase;
  const { data: member } = ctx.playerId
    ? await supabase.from('event_members').select('profile_id').eq('event_id', eventId).eq('profile_id', ctx.playerId).maybeSingle()
    : { data: null };
  if (!member && !ctx.isAdmin && ctx.mode !== 'house') return { success: false, message: 'Join the event before adding players.' };
  const { data: target } = await supabase.from('profiles').select('id').eq('id', profileId).maybeSingle();
  if (!target) return { success: false, message: 'Choose an existing player profile.' };

  // Check if already a member
  const { data: existing } = await supabase
    .from('event_members')
    .select('event_id')
    .eq('event_id', eventId)
    .eq('profile_id', profileId)
    .single();

  if (existing) {
    return { success: true, message: 'Already in the event.' };
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
    return { success: false, message: 'Could not add this player. Check your event permissions and try again.' };
  }

  revalidatePath(`/events/${eventId}`, 'layout');
  revalidatePath('/');
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
  return members.map((m) => {
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

export async function endEvent(eventId: string) {
  const ctx = await resolvePlayer();
  if (!ctx.playerId && !ctx.isAdmin) return { success: false, message: 'Choose your name first.' };
  const supabase = ctx.supabase;

  const { data: member } = ctx.playerId
    ? await supabase.from('event_members').select('role').eq('event_id', eventId).eq('profile_id', ctx.playerId).maybeSingle()
    : { data: null };

  if (!ctx.isAdmin && member?.role !== 'owner') {
     return { success: false, message: 'Only the event owner can end the event.' };
  }

  const { error } = await supabase
    .from('events')
    .update({ is_active: false })
    .eq('id', eventId);

  if (error) {
    console.error('Error ending event:', error);
    return { success: false, message: 'Failed to end event.' };
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath('/events');
  revalidatePath('/'); 
  return { success: true };
}

export async function reactivateEvent(eventId: string) {
  const ctx = await resolvePlayer();
  if (!ctx.playerId && !ctx.isAdmin) return { success: false, message: 'Choose your name first.' };
  const supabase = ctx.supabase;

  const { data: member } = ctx.playerId
    ? await supabase.from('event_members').select('role').eq('event_id', eventId).eq('profile_id', ctx.playerId).maybeSingle()
    : { data: null };

  if (!ctx.isAdmin && member?.role !== 'owner') {
     return { success: false, message: 'Only the event owner can reactivate the event.' };
  }

  const { error } = await supabase
    .from('events')
    .update({ is_active: true })
    .eq('id', eventId);

  if (error) {
    console.error('Error reactivating event:', error);
    return { success: false, message: 'Failed to reactivate event.' };
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath('/events');
  revalidatePath('/'); 
  return { success: true };
}
