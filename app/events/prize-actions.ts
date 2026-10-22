'use server';

import { revalidatePath } from 'next/cache';
import { resolvePlayer } from '@/lib/player-session';

export async function addEventPrize(eventId: string, name: string, note: string): Promise<{ success: boolean; message?: string }> {
  const ctx = await resolvePlayer();
  if (!ctx.playerId) return { success: false, message: 'Choose your name first.' };
  if (!name.trim()) return { success: false, message: 'Name the prize' };

  const { error } = await ctx.supabase.from('event_prizes').insert({
    event_id: eventId,
    name: name.trim(),
    note: note.trim() || null,
    brought_by: ctx.playerId,
  });
  if (error) return { success: false, message: error.message };
  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function awardEventPrize(eventId: string, prizeId: string, profileId: string): Promise<{ success: boolean; message?: string }> {
  const ctx = await resolvePlayer();
  if (!ctx.authUser) return { success: false, message: 'Choose your name first.' };

  const { data: membership } = ctx.playerId
    ? await ctx.supabase.from('event_members').select('role').eq('event_id', eventId).eq('profile_id', ctx.playerId).maybeSingle()
    : { data: null };
  if (!ctx.isAdmin && membership?.role !== 'owner' && membership?.role !== 'admin') {
    return { success: false, message: 'Only the host can hand out a prize' };
  }

  const { error } = await ctx.supabase.from('event_prizes').update({ awarded_to: profileId || null }).eq('id', prizeId).eq('event_id', eventId);
  if (error) return { success: false, message: error.message };
  revalidatePath(`/events/${eventId}`);
  return { success: true };
}
