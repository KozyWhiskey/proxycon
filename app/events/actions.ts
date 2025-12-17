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
  endDate?: string
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
    })
    .select()
    .single();

  if (eventError || !event) {
    console.error('Error creating event:', eventError);
    return { success: false, message: eventError?.message || 'Failed to create event' };
  }

  // 2. Add creator as admin participant
  const { error: participantError } = await supabase
    .from('event_participants')
    .insert({
      event_id: event.id,
      profile_id: user.id,
      role: 'admin',
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
    .from('event_participants')
    .select('event_id')
    .eq('event_id', event.id)
    .eq('profile_id', user.id)
    .single();

  if (existing) {
    return { success: true, eventId: event.id, message: 'Already joined' };
  }

  // 3. Join
  const { error: joinError } = await supabase
    .from('event_participants')
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
