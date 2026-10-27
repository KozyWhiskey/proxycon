'use server';
import { resolvePlayer } from '@/lib/player-session';
import { loadEventBoard } from '@/lib/event-board';
import { revalidatePath } from 'next/cache';
export async function editAgenda(eventId: string, itemId: string | null, revision: number, operation: 'save' | 'delete' | 'up' | 'down', values: Record<string, string> = {}) {
    const board = await loadEventBoard(eventId);
    if (!board?.canManage)
        return { success: false, message: 'Join the event before editing plans.' };
    const ctx = await resolvePlayer();
    const { error } = await ctx.supabase.rpc('edit_weekend_agenda', { p_event: eventId, p_item: itemId, p_revision: revision, p_operation: operation, p_values: values });
    if (error) {
        const { data: current } = itemId ? await ctx.supabase.from('event_agenda_items').select('*').eq('event_id', eventId).eq('id', itemId).maybeSingle() : { data: null };
        return { success: false, message: error.message, current };
    }
    revalidatePath('/events/' + eventId, 'layout');
    return { success: true, message: operation === 'delete' ? 'Plan removed.' : 'Plan saved.' };
}
export async function saveOrientation(tournamentId: string, pod: number, label: string) { const ctx = await resolvePlayer(); const { data: t } = await ctx.supabase.from('tournaments').select('event_id,pod_orientations').eq('id', tournamentId).maybeSingle(); if (!t?.event_id)
    return { success: false, message: 'Tournament unavailable.' }; const b = await loadEventBoard(t.event_id); if (!b?.canManage)
    return { success: false, message: 'Join this event first.' }; if (![1, 2].includes(pod) || label.length > 80)
    return { success: false, message: 'Use an orientation label up to 80 characters.' }; const old = t.pod_orientations || {}; const { data, error } = await ctx.supabase.from('tournaments').update({ pod_orientations: { ...old, [pod]: label.trim() } }).eq('id', tournamentId).eq('pod_orientations', JSON.stringify(old)).select('id'); if (error || !data?.length)
    return { success: false, message: 'Seating changed. Reload before saving this label.' }; revalidatePath('/events/' + t.event_id, 'layout'); revalidatePath('/tournament/' + tournamentId); return { success: true, message: 'Orientation saved.' }; }
