'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

interface OnboardingData {
  displayName: string
}

function handleFrom(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 16) || 'player'
  return `${base}${Math.floor(Math.random() * 9000 + 1000)}`
}

export async function completeOnboarding(data: OnboardingData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'Not authenticated' }
  }

  if (user.is_anonymous) return { success: false, message: 'Open the weekend guest link to choose your name.' }

  const playName = data.displayName.trim()
  if (!playName) return { success: false, message: 'Enter a play name.' }

  const { data: existing } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle()

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      username: existing?.username || handleFrom(playName),
      display_name: playName,
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