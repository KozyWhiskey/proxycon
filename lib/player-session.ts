import { createClient } from '@/utils/supabase/server';
import type { User } from '@supabase/supabase-js';

export type PlayerMode = 'account' | 'player' | 'house' | 'unbound';

export interface PlayerContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  authUser: User | null;
  playerId: string | null;
  mode: PlayerMode;
  isAdmin: boolean;
}

export async function resolvePlayer(): Promise<PlayerContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { supabase, authUser: null, playerId: null, mode: 'unbound', isAdmin: false };
  }

  const { data, error } = await supabase.rpc('current_player_context');
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
    playerId: context.profileId || null,
    mode,
    isAdmin: Boolean(context.isAdmin),
  };
}
