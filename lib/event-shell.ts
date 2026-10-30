import { cache } from 'react';
import { resolvePlayer, type PlayerContext } from '@/lib/player-session';
import { eventCapabilities } from '@/lib/event-capabilities';
import { z } from 'zod';

export function personName(profile?: { display_name?: string | null; username?: string | null } | null) {
  return profile?.display_name || profile?.username || 'Player';
}

/** Small shared shell. React memoization lasts only for the current server render. */
export const loadEventShell = cache(async (eventId: string) => loadEventShellForPlayer(eventId, await resolvePlayer()));

export async function loadEventShellForPlayer(eventId: string, ctx: PlayerContext) {
  if (!z.uuid().safeParse(eventId).success) return null;
  const [{ data: event, error: eventError }, { data: rows, error: memberError }] = await Promise.all([
    ctx.supabase.from('events').select('id, name, start_date, end_date, invite_code, is_active').eq('id', eventId).maybeSingle(),
    ctx.supabase.from('event_members').select('profile_id, role, profile:profiles(id, display_name, username, color)').eq('event_id', eventId),
  ]);
  if (eventError || memberError) throw new Error('Could not refresh the event. Try again.');
  if (!event) return null;
  const members = (rows || []).map(row => {
    const p = Array.isArray(row.profile) ? row.profile[0] : row.profile;
    return { id: row.profile_id as string, role: row.role as string, name: personName(p), color: (p?.color as string | null) || null };
  }).filter(m => m.id);
  return {
    fetchedAt: new Date().toISOString(), userId: ctx.playerId, event, members,
    names: new Map(members.map(m => [m.id, m.name])),
    ...eventCapabilities({ authenticated: Boolean(ctx.authUser), playerId: ctx.playerId, house: ctx.mode === 'house', admin: ctx.isAdmin, member: members.some(m => m.id === ctx.playerId) }),
  };
}
