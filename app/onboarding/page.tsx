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
      <div className="onboarding-intro">
        <p className="eyebrow">WELCOME</p>
        <h1 className="font-sans text-3xl font-semibold tracking-tight">Choose a play name</h1>
      </div>
      <OnboardingForm suggestion={suggestion} />
    </div>
  )
}
