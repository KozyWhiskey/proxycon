'use server';

import { getCurrentUserId } from '@/lib/get-current-user';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

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

    // Build update object - always include all fields
    const updateData: any = {
      nickname: data.nickname?.trim() || null,
      avatar_url: data.avatar_url?.trim() || null,
      color: data.color?.trim() || null,
    };

    // Update the current user's profile
    const { error } = await supabase
      .from('players')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      // Surface a clear error if the color column is missing so the user knows to run the migration
      if (error.message.includes('column') && error.message.includes('color')) {
        return {
          success: false,
          message:
            'Player color column is missing. Run .dev-docs/DATABASE_MIGRATION_add_player_color.md in Supabase, then try again.',
        };
      }
      return { success: false, message: `Failed to update profile: ${error.message}` };
    }

    revalidatePath('/');
    revalidatePath('/login');
    return { success: true, message: 'Profile updated successfully' };
  } catch (error) {
    console.error('Error in updateMyProfile:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return { success: false, message: errorMessage };
  }
}

/**
 * @deprecated Use updateMyProfile instead
 * Updates the current user's nickname.
 * Users can only update their own nickname.
 */
export async function updateMyNickname(nickname: string | null): Promise<UpdateProfileResult> {
  return updateMyProfile({ nickname, color: null, avatar_url: null });
}
