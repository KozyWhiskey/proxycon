import { User } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { Profile } from './types';
import { PlayerMode, resolvePlayer } from './player-session';
import { cache } from 'react';

export interface CurrentUser {
  user: User;
  profile: Profile | null;
  mode: PlayerMode;
  isAdmin: boolean;
}

/**
 * The signed-in browser and the player it is acting as.
 * A phone session can point at a profile that has no login of its own.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const ctx = await resolvePlayer();
  if (!ctx.authUser) return null;

  let profile: Profile | null = null;
  if (ctx.playerId) {
    const { data, error } = await ctx.supabase.from('profiles').select('*').eq('id', ctx.playerId).maybeSingle();
    if (error) throw new Error('Could not retrieve your player profile. Try again.');
    profile = data;
  }

  return { user: ctx.authUser, profile, mode: ctx.mode, isAdmin: ctx.isAdmin };
});

/**
 * Pages that belong to one player. A phone that has not picked a name goes back to the list.
 */
export async function requireProfile(): Promise<{ user: User; profile: Profile }> {
  const authData = await getCurrentUser();

  if (!authData?.user) redirect('/');

  if (!authData.profile?.display_name) {
    if (!authData.user.is_anonymous) redirect('/onboarding');
    redirect('/');
  }

  return { user: authData.user, profile: authData.profile };
}

/**
 * The playgroup directory. The house laptop can open it without becoming a player.
 * A phone that has not picked a name still goes back to the list.
 */
export async function requirePlaygroup(): Promise<CurrentUser> {
  const authData = await getCurrentUser();

  if (!authData?.user) redirect('/');
  if (authData.mode === 'house') return authData;

  if (!authData.profile?.display_name) {
    if (!authData.user.is_anonymous) redirect('/onboarding');
    redirect('/');
  }

  return authData;
}

/**
 * The player this browser is acting as. Deck, result, and profile writes use this id.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const current = await getCurrentUser();
  return current?.profile?.id || null;
}
