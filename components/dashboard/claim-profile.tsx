'use client'

import { useState } from 'react'
import { claimPlayer, createNewPlayer } from '@/app/user/actions'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Loader2, Plus, ArrowRight } from 'lucide-react'

interface Player {
  id: string
  name: string
  avatar_url: string | null
}

export default function ClaimProfile({ players }: { players: Player[] }) {
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)

  async function handleClaim(playerId: string) {
    setClaimingId(playerId)
    try {
      const res = await claimPlayer(playerId)
      if (res.success) {
        toast.success('Profile claimed successfully!')
      } else {
        toast.error(res.message || 'Failed to claim profile')
      }
    } catch (e) {
      toast.error('An error occurred')
    } finally {
      setClaimingId(null)
    }
  }

  async function handleCreateNew() {
    setIsCreatingNew(true)
    try {
      const res = await createNewPlayer()
      if (res.success) {
        toast.success('New profile created successfully!')
      } else {
        toast.error(res.message || 'Failed to create profile')
      }
    } catch (e) {
      toast.error('An error occurred')
    } finally {
      setIsCreatingNew(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-yellow-500/50 bg-yellow-950/10">
        <CardHeader>
          <CardTitle className="text-yellow-500">Link Existing Profile</CardTitle>
          <CardDescription>
            Were you at the last tournament? Select your name to link your match history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {players.map((player) => (
              <Button
                key={player.id}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-3 bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-yellow-500/50"
                onClick={() => handleClaim(player.id)}
                disabled={claimingId !== null || isCreatingNew}
              >
                <Avatar className="w-16 h-16">
                  <AvatarImage src={player.avatar_url || ''} />
                  <AvatarFallback className="bg-slate-800 text-slate-400">
                    {player.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-slate-200 text-center text-wrap">{player.name}</span>
                {claimingId === player.id && <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-950 px-2 text-slate-500">Or</span>
        </div>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle>New to Upkeep?</CardTitle>
          <CardDescription>
            If you haven&apos;t played before, create a fresh profile to start tracking your stats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            className="w-full sm:w-auto" 
            onClick={handleCreateNew}
            disabled={claimingId !== null || isCreatingNew}
          >
            {isCreatingNew ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Create New Player Profile
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}