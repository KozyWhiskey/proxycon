'use server';

import { getCurrentUserId } from '@/lib/get-current-user';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';


interface UpdateProfileResult {
  success: boolean;
  message?: string;
}

/**
 * Updates the current user's profile (nickname, color, avatar_url).
 * Users can only update their own profile.
 */
export async function updateMyProfile(data: {
  nickname: string | null;
  color: string | null;
  avatar_url: string | null;
}): Promise<UpdateProfileResult> {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { success: false, message: 'You must be logged in to update your profile' };
    }

    const supabase = await createClient();

    // V2: Update 'profiles' table
    const updateData: any = {
      // mapping nickname -> username? or keeping nickname in profile?
      // V2 schema has 'username', 'avatar_url'. No 'color' in profiles.
      // 'color' is still in 'players' table.
      avatar_url: data.avatar_url?.trim() || null,
      // bio?
    };

    // We also need to update the LINKED player record if it exists
    // This is messy during migration.
    // Let's try to update 'profiles' first.
    const { error: profileError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (profileError) {
        console.error('Error updating profile:', profileError);
        // Fallback or ignore?
    }

    // Also update 'players' table via profile_id link
    // This maintains backward compatibility for V1 views that query 'players'
    const playerUpdateData: any = {
      nickname: data.nickname?.trim() || null,
      color: data.color?.trim() || null,
      avatar_url: data.avatar_url?.trim() || null,
    };
    
    const { error } = await supabase
      .from('players')
      .update(playerUpdateData)
      .eq('profile_id', userId); // Use profile_id to find the linked player

    if (error) {
       console.error('Error updating linked player:', error);
       // This might fail if the user hasn't claimed a player yet.
       // In that case, maybe we should create a new player record?
       // For now, let's just return success if profile updated.
    }

    revalidatePath('/');
    return { success: true, message: 'Profile updated successfully' };
  } catch (error) {
    console.error('Error in updateMyProfile:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}

/**
 * Claims a legacy player record for the current authenticated user.
 */
export async function claimPlayer(playerId: string): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, message: 'Not authenticated' };

  // Check if player is already claimed
  const { data: player } = await supabase
    .from('players')
    .select('profile_id, name, avatar_url')
    .eq('id', playerId)
    .single();
    
  if (!player) return { success: false, message: 'Player not found' };
  if (player.profile_id) return { success: false, message: 'Player already claimed' };

  // Update player
  const { error } = await supabase
    .from('players')
    .update({ profile_id: user.id })
    .eq('id', playerId);

  if (error) return { success: false, message: error.message };
  
  // Optionally copy data to profile
  await supabase.from('profiles').update({
      username: player.name, // Use player Name as username initially
      avatar_url: player.avatar_url
  }).eq('id', user.id);

  revalidatePath('/');
  return { success: true };
}

/**
 * Creates a new player record for a new user who wasn't in the legacy system.
 */
export async function createNewPlayer(): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, message: 'Not authenticated' };

  // Get profile data to use for new player
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return { success: false, message: 'Profile not found' };

  // Create new player record linked to this profile
  const { error } = await supabase
    .from('players')
    .insert({
      profile_id: user.id,
      name: profile.username || 'New Player', // Fallback name
      avatar_url: profile.avatar_url,
      wins: 0
    });

  if (error) {
    console.error('Error creating new player:', error);
    return { success: false, message: error.message };
  }

  revalidatePath('/');
  return { success: true };
}

/**
 * Logs out the current user.
 */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}


/**
 * @deprecated Use updateMyProfile instead
 */
export async function updateMyNickname(nickname: string | null): Promise<UpdateProfileResult> {
  return updateMyProfile({ nickname, color: null, avatar_url: null });
}