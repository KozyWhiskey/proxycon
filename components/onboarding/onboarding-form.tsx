'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding } from '@/app/onboarding/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function OnboardingForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    favoriteCard: ''
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await completeOnboarding(formData)
      
      if (result.success) {
        toast.success("Profile created! Welcome to the league.")
        router.push('/')
        router.refresh()
      } else {
        toast.error(result.message || "Failed to create profile")
        setIsLoading(false)
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-2xl text-center text-white">Setup Your Profile</CardTitle>
        <CardDescription className="text-center text-slate-400">
          Create your player identity to start tracking stats.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-white">Username</Label>
            <Input
              id="username"
              placeholder="@jace_beleren"
              required
              className="bg-slate-950 border-slate-800 text-white"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            />
            <p className="text-xs text-slate-500">Your unique handle for the league.</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-white">Display Name</Label>
            <Input
              id="displayName"
              placeholder="Jace Beleren"
              required
              className="bg-slate-950 border-slate-800 text-white"
              value={formData.displayName}
              onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
            />
            <p className="text-xs text-slate-500">How you'll appear in tournament brackets.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="favoriteCard" className="text-white">Favorite Card (Optional)</Label>
            <Input
              id="favoriteCard"
              placeholder="Jace, the Mind Sculptor"
              className="bg-slate-950 border-slate-800 text-white"
              value={formData.favoriteCard}
              onChange={(e) => setFormData(prev => ({ ...prev, favoriteCard: e.target.value }))}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full bg-yellow-500 text-black hover:bg-yellow-400"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Profile...
              </>
            ) : (
              'Complete Setup'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
