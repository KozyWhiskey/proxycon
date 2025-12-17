import { createClient } from '@/utils/supabase/server';
import { User } from '@supabase/supabase-js';
import { Profile } from './types';

export interface CurrentUser {
  user: User;
  profile: Profile | null;
}

/**
 * Gets the current authenticated user and their profile.
 * Returns null if no user is logged in.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return {
    user,
    profile: profile || null
  };
}

/**
 * @deprecated Use getCurrentUser() instead.
 * Kept for backward compatibility during refactor.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.user.id || null;
}