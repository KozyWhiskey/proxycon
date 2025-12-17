'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

interface OnboardingData {
  username: string
  displayName: string
  favoriteCard?: string
}

export async function completeOnboarding(data: OnboardingData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'Not authenticated' }
  }

  // Create or Update the Profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      username: data.username,
      display_name: data.displayName, // V3: display_name
      favorite_card_image: data.favoriteCard || null,
      bio: '', 
      updated_at: new Date().toISOString()
    })

  if (profileError) {
    console.error('Profile creation error:', profileError)
    if (profileError.code === '23505') { // Unique violation
      return { success: false, message: 'Username is already taken' }
    }
    // Return the actual error message for debugging
    return { success: false, message: `Failed to create profile: ${profileError.message} (${profileError.details || profileError.code})` }
  }

  // NOTE: Legacy 'players' table insertion removed for V3.

  revalidatePath('/', 'layout')
  return { success: true }
}