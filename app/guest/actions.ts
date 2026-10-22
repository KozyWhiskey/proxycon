'use server';

import { createHash, randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { guestName, guestToken, guestInvitationSchema } from '@/lib/guest-access';

async function adminDatabase() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) throw new Error('Administrator access required.');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') throw new Error('Administrator access required.');
  return supabase;
}

export async function createGuestInvitation(eventId: string) {
  if (!z.uuid().safeParse(eventId).success) return { success: false as const, message: 'Choose an event.' };
  try {
    const db = await adminDatabase();
    const token = randomBytes(32).toString('hex');
    const { data, error } = await db.rpc('create_weekend_guest_invitation', {
      p_event_id: eventId, p_token_hash: createHash('sha256').update(token).digest('hex'),
    });
    if (error) return { success: false as const, message: error.code === 'PGRST202' ? 'Weekend guest access needs to be enabled in Supabase first.' : error.message };
    revalidatePath('/admin');
    return { success: true as const, invitationId: String(data), token };
  } catch {
    return { success: false as const, message: 'Could not create a guest link. Check your admin access and connection.' };
  }
}

export async function addGuestSpot(invitationId: string, name: string) {
  const parsed = guestName.safeParse(name);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };
  if (!z.uuid().safeParse(invitationId).success) return { success: false, message: 'Create a guest link first.' };
  try {
    const db = await adminDatabase();
    const { error } = await db.rpc('add_weekend_guest_spot', { p_invitation_id: invitationId, p_display_name: parsed.data });
    if (error) return { success: false, message: error.message };
    revalidatePath('/admin');
    return { success: true };
  } catch {
    return { success: false, message: 'Could not add this player. Check your connection and try again.' };
  }
}

export async function claimGuestSpot(token: string, spotId: string) {
  if (!guestToken.safeParse(token).success || !z.uuid().safeParse(spotId).success) {
    return { success: false as const, message: 'Open the guest link shared by your admin.' };
  }
  const db = await createClient();
  try {
    // Validate the link and spot before creating a phone session.
    const { data: invitation, error: readError } = await db.rpc('read_weekend_guest_invitation', { p_token: token });
    const parsed = guestInvitationSchema.safeParse(invitation);
    if (readError || !parsed.success) return { success: false as const, message: 'This guest link is unavailable. Ask the admin for a new link.' };
    const spot = parsed.data.spots.find(row => row.id === spotId);
    if (!spot) return { success: false as const, message: 'That name is not on this guest list.' };
    const { data: { user } } = await db.auth.getUser();
    if (user && !user.is_anonymous) return { success: false as const, message: 'You already have an account. Open the event using your own profile.' };
    if (!user && spot.claimed) return { success: false as const, message: 'This name is already claimed. Ask the admin for help.' };
    if (!user) {
      const { error } = await db.auth.signInAnonymously({ options: { data: {
        username: 'guest_' + randomBytes(6).toString('hex'), display_name: spot.name, full_name: spot.name,
      } } });
      if (error) return { success: false as const, message: error.code === 'anonymous_provider_disabled'
        ? 'Weekend sign-in is not enabled yet. Ask the admin to enable it.'
        : 'Could not start your phone session. Try again or ask the admin for help.' };
    }
    const { data: eventId, error } = await db.rpc('claim_weekend_guest_spot', { p_token: token, p_spot_id: spotId });
    if (error || !eventId) return { success: false as const, message: error?.message || 'This spot could not be claimed.' };
    revalidatePath('/', 'layout');
    return { success: true as const, eventId: String(eventId) };
  } catch {
    return { success: false as const, message: 'Could not claim this spot. Check your connection and try again.' };
  }
}
