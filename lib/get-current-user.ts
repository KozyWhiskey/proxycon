import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

/**
 * Gets the current logged-in user from the proxycon_user_id cookie.
 * Returns null if no user is logged in.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('proxycon_user_id')?.value;
  return userId || null;
}

/**
 * Gets the full current user object from the database.
 * Returns null if no user is logged in or user not found.
 */
export async function getCurrentUser() {
  const userId = await getCurrentUserId();
  
  if (!userId) {
    return null;
  }

  const supabase = await createClient();
  const { data: user, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return null;
  }

  return user;
}

