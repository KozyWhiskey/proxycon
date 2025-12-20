'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { logCasualMatch } from '@/app/play/actions'; 
import { Loader2, Users, User, Swords } from 'lucide-react';
import { Profile, Deck } from '@/lib/types';

interface CasualGameFormProps {
  players: Profile[];
  allDecks: Deck[];
  eventId?: string;
}

type GameFormat = 'commander' | '1v1' | '2hg' | 'ffa' | 'limited';

export default function CasualGameForm({ players, allDecks, eventId }: CasualGameFormProps) {
  const router = useRouter();
  const [format, setFormat] = useState<GameFormat>('commander');
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [selectedDecks, setSelectedDecks] = useState<Record<string, string>>({});
  const [winnerProfileIds, setWinnerProfileIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to toggle profile selection
  const toggleProfile = (profileId: string) => {
    setSelectedProfiles((prev) => {
      if (prev.includes(profileId)) {
        return prev.filter((id) => id !== profileId);
      }
      // Limits based on format
      if (format === '1v1' && prev.length >= 2) return prev;
      if (format === '2hg' && prev.length >= 4) return prev;
      // Soft limits for others
      return [...prev, profileId];
    });
  };

  const handleDeckChange = (profileId: string, deckId: string) => {
    setSelectedDecks((prev) => ({ ...prev, [profileId]: deckId }));
  };

  const toggleWinner = (profileId: string) => {
    if (format === '2hg') {
        // In 2HG, we select a team
        setWinnerProfileIds(prev => prev.includes(profileId) ? prev.filter(id => id !== profileId) : [...prev, profileId]);
    } else {
        // Single winner for others (usually)
        setWinnerProfileIds([profileId]);
    }
  };

  const handleSubmit = async () => {
    if (selectedProfiles.length < 2) {
      toast.error('Select at least 2 players');
      return;
    }
    if (winnerProfileIds.length === 0) {
      toast.error('Select a winner');
      return;
    }

    setIsSubmitting(true);

    const result = await logCasualMatch({
      format,
      profileIds: selectedProfiles,
      deckIds: selectedDecks,
      winnerProfileIds: winnerProfileIds,
      eventId,
    });

    if (result.success) {
      toast.success('Match logged successfully!');
      if (eventId) {
        router.push(`/events/${eventId}`);
      } else {
        router.push('/');
      }
    } else {
      toast.error(result.message || 'Failed to log match');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Format Selection */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant={format === 'commander' ? 'default' : 'outline'}
          onClick={() => { setFormat('commander'); setSelectedProfiles([]); setWinnerProfileIds([]); }}
          className="h-20 flex flex-col gap-2"
        >
          <Users className="w-6 h-6" />
          <span className="text-xs">Commander</span>
        </Button>
        <Button
          type="button"
          variant={format === '1v1' ? 'default' : 'outline'}
          onClick={() => { setFormat('1v1'); setSelectedProfiles([]); setWinnerProfileIds([]); }}
          className="h-20 flex flex-col gap-2"
        >
          <User className="w-6 h-6" />
          <span className="text-xs">1v1</span>
        </Button>
        <Button
          type="button"
          variant={format === '2hg' ? 'default' : 'outline'}
          onClick={() => { setFormat('2hg'); setSelectedProfiles([]); setWinnerProfileIds([]); }}
          className="h-20 flex flex-col gap-2"
        >
          <Swords className="w-6 h-6" />
          <span className="text-xs">2HG (2v2)</span>
        </Button>
        <Button
          type="button"
          variant={format === 'ffa' ? 'default' : 'outline'}
          onClick={() => { setFormat('ffa'); setSelectedProfiles([]); setWinnerProfileIds([]); }}
          className="h-20 flex flex-col gap-2"
        >
          <Users className="w-6 h-6" />
          <span className="text-xs">Free for All</span>
        </Button>
        <Button
          type="button"
          variant={format === 'limited' ? 'default' : 'outline'}
          onClick={() => { setFormat('limited'); setSelectedProfiles([]); setWinnerProfileIds([]); }}
          className="h-20 flex flex-col gap-2"
        >
          <Swords className="w-6 h-6" />
          <span className="text-xs">Limited</span>
        </Button>
      </div>

      {/* Player Selection */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-lg font-heading">Select Players</CardTitle>
          <CardDescription>
            {format === '1v1' ? 'Select 2 players' : format === '2hg' ? 'Select 4 players' : 'Select players'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {players.map((profile) => (
              <Button
                key={profile.id}
                type="button"
                variant={selectedProfiles.includes(profile.id) ? 'default' : 'outline'}
                className={`justify-start px-2 h-auto py-2 ${
                  selectedProfiles.includes(profile.id) ? 'bg-primary hover:bg-primary/90' : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
                onClick={() => toggleProfile(profile.id)}
              >
                <div className="flex items-center gap-2 overflow-hidden w-full">
                  <div className="w-6 h-6 rounded-full bg-zinc-800 flex-shrink-0 border border-white/10">
                    {profile.avatar_url && (
                        <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover"/>
                    )}
                  </div>
                  <span className="truncate">{profile.display_name || profile.username || 'Player'}</span>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Deck & Winner Selection */}
      {selectedProfiles.length > 0 && (
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Decks & Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedProfiles.map((profileId) => {
              const profile = players.find((p) => p.id === profileId);
              if (!profile) return null;
              const isWinner = winnerProfileIds.includes(profileId);
              
              // Filter decks for this player
              const playerDecks = allDecks.filter(d => d.owner_id === profileId);

              return (
                <div key={profileId} className="flex flex-col gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{profile.display_name || profile.username || 'Player'}</span>
                    <Button
                      size="sm"
                      variant={isWinner ? 'default' : 'ghost'}
                      onClick={() => toggleWinner(profileId)}
                      className={isWinner ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'text-muted-foreground hover:text-foreground'}
                    >
                      {isWinner ? 'Winner 🏆' : 'Select as Winner'}
                    </Button>
                  </div>
                  
                   <Select 
                    value={selectedDecks[profileId] || ''} 
                    onValueChange={(val) => handleDeckChange(profileId, val)}
                   >
                    <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10">
                        <SelectValue placeholder="Select Deck (Optional)" />
                    </SelectTrigger>
                    <SelectContent>
                        {playerDecks.length > 0 ? (
                            playerDecks.map(deck => (
                                <SelectItem key={deck.id} value={deck.id}>{deck.name}</SelectItem>
                            ))
                        ) : (
                            <SelectItem value="none" disabled>No decks found</SelectItem>
                        )}
                    </SelectContent>
                   </Select>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Button 
        onClick={handleSubmit} 
        disabled={isSubmitting || selectedProfiles.length < 2 || winnerProfileIds.length === 0}
        className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] font-heading tracking-wide"
      >
        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log Match'}
      </Button>
    </div>
  );
}
