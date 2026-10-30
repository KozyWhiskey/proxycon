import { createClient } from '@/utils/supabase/server';
import type { User } from '@supabase/supabase-js';
import { cache } from 'react';
import { profile } from '@/lib/performance';

export type PlayerMode = 'account' | 'player' | 'house' | 'unbound';

export interface PlayerContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  authUser: User | null;
  playerId: string | null;
  mode: PlayerMode;
  isAdmin: boolean;
}

async function resolvePlayerUncached(): Promise<PlayerContext> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError && authError.name !== 'AuthSessionMissingError' && (!authError.status || authError.status >= 500)) throw authError;
  if (!user) {
    return { supabase, authUser: null, playerId: null, mode: 'unbound', isAdmin: false };
  }

  const { data, error } = await supabase.rpc('current_player_context');
  if (error && (!error.code || error.code === 'PGRST000' || error.code === 'PGRST001')) throw new Error('Could not retrieve your player context.');
  if (error || !data || typeof data !== 'object') {
    const account = !user.is_anonymous;
    return {
      supabase,
      authUser: user,
      playerId: account ? user.id : null,
      mode: account ? 'account' : 'unbound',
      isAdmin: false,
    };
  }

  const context = data as { profileId?: string | null; mode?: PlayerMode; isAdmin?: boolean };
  const mode = context.mode || (user.is_anonymous ? 'unbound' : 'account');
  return {
    supabase,
    authUser: user,
    playerId: mode === 'house' ? null : context.profileId || null,
    mode,
    isAdmin: Boolean(context.isAdmin),
  };
}

/** React clears this memoization between server requests; identities are never shared. */
export const resolvePlayerFresh = () => profile('resolvePlayer', resolvePlayerUncached);
export const resolvePlayer = cache(resolvePlayerFresh);
