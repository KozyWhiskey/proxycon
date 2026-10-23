import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingForm from '@/components/onboarding/onboarding-form'
import { Brand } from '@/components/layout/brand'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (user.is_anonymous) redirect('/guest')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  if (profile?.display_name) redirect('/')

  const meta = user.user_metadata || {}
  const suggestion = String(meta.full_name || meta.name || '').trim()

  return (
    <div className="onboarding-stage">
      <Brand />
      <div className="onboarding-intro"><p className="eyebrow">WELCOME TO THE PLAYGROUP</p><h1>A name for<br /><em>every table.</em></h1></div>
      <OnboardingForm suggestion={suggestion} />
    </div>
  )
}
