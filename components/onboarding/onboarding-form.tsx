'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding } from '@/app/onboarding/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function OnboardingForm({ suggestion }: { suggestion: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [playName, setPlayName] = useState(suggestion)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsLoading(true)
    const result = await completeOnboarding({ displayName: playName })
    if (result.success) {
      toast.success('Play name saved.')
      router.push('/')
      router.refresh()
    } else {
      toast.error(result.message || 'Could not save the play name.')
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md glass-panel">
      <CardHeader>
        <CardTitle className="text-2xl text-center font-heading">Play name</CardTitle>
        <CardDescription className="text-center">
          This is the name on every table. The Google name is only a suggestion. Changing it later updates every event you have already played.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="playName">Play name</Label>
            <Input
              id="playName"
              required
              maxLength={40}
              value={playName}
              onChange={(event) => setPlayName(event.target.value)}
              className="bg-card border-border"
            />
          </div>
          <Button type="submit" className="w-full font-heading" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save play name
          </Button>
        </CardContent>
      </form>
    </Card>
  )
}
