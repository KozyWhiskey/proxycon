import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingForm from '@/components/onboarding/onboarding-form'
import Image from 'next/image'
import badgeImg from '@/public/proxycon_badge.png'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if profile already exists to prevent re-onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  if (profile?.username) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 flex flex-col items-center">
        <Image
          src={badgeImg}
          alt="ProxyCon 2025"
          width={120}
          height={120}
          className="drop-shadow-lg"
        />
        <OnboardingForm />
      </div>
    </div>
  )
}
