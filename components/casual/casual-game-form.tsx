'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { logCasualMatch } from '@/app/play/actions'; // We will update this action
import { Loader2, Users, User, Swords } from 'lucide-react';
import { Profile, Deck } from '@/lib/types'; // Updated import

interface CasualGameFormProps {
  players: Profile[]; // Changed to Profile[]
  userDecks: Deck[];
  eventId?: string;
}

type GameFormat = 'commander' | '1v1' | '2hg' | 'ffa' | 'limited';

export default function CasualGameForm({ players, userDecks, eventId }: CasualGameFormProps) {
  const router = useRouter();
  const [format, setFormat] = useState<GameFormat>('commander');
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]); // Changed to selectedProfiles
  const [selectedDecks, setSelectedDecks] = useState<Record<string, string>>({});
  const [winnerProfileIds, setWinnerProfileIds] = useState<string[]>([]); // Changed to winnerProfileIds
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to toggle profile selection
  const toggleProfile = (profileId: string) => { // Changed to profileId
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

  const handleDeckChange = (profileId: string, deckId: string) => { // Changed to profileId
    setSelectedDecks((prev) => ({ ...prev, [profileId]: deckId }));
  };

  const toggleWinner = (profileId: string) => { // Changed to profileId
    if (format === '2hg') {
        // In 2HG, we select a team
        setWinnerProfileIds(prev => prev.includes(profileId) ? prev.filter(id => id !== profileId) : [...prev, profileId]);
    } else {
        // Single winner for others (usually)
        setWinnerProfileIds([profileId]);
    }
  };

  const handleSubmit = async () => {
    if (selectedProfiles.length < 2) { // Changed to selectedProfiles
      toast.error('Select at least 2 players');
      return;
    }
    if (winnerProfileIds.length === 0) { // Changed to winnerProfileIds
      toast.error('Select a winner');
      return;
    }

    setIsSubmitting(true);

    const result = await logCasualMatch({
      format,
      profileIds: selectedProfiles, // Changed to profileIds
      deckIds: selectedDecks,
      winnerProfileIds: winnerProfileIds, // Changed to winnerProfileIds
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
          onClick={() => { setFormat('commander'); setSelectedProfiles([]); setWinnerProfileIds([]); }} // Changed to setSelectedProfiles, setWinnerProfileIds
          className="h-20 flex flex-col gap-2"
        >
          <Users className="w-6 h-6" />
          <span className="text-xs">Commander</span>
        </Button>
        <Button
          type="button"
          variant={format === '1v1' ? 'default' : 'outline'}
          onClick={() => { setFormat('1v1'); setSelectedProfiles([]); setWinnerProfileIds([]); }} // Changed to setSelectedProfiles, setWinnerProfileIds
          className="h-20 flex flex-col gap-2"
        >
          <User className="w-6 h-6" />
          <span className="text-xs">1v1</span>
        </Button>
        <Button
          type="button"
          variant={format === '2hg' ? 'default' : 'outline'}
          onClick={() => { setFormat('2hg'); setSelectedProfiles([]); setWinnerProfileIds([]); }} // Changed to setSelectedProfiles, setWinnerProfileIds
          className="h-20 flex flex-col gap-2"
        >
          <Swords className="w-6 h-6" />
          <span className="text-xs">2HG (2v2)</span>
        </Button>
        <Button
          type="button"
          variant={format === 'ffa' ? 'default' : 'outline'}
          onClick={() => { setFormat('ffa'); setSelectedProfiles([]); setWinnerProfileIds([]); }} // Changed to setSelectedProfiles, setWinnerProfileIds
          className="h-20 flex flex-col gap-2"
        >
          <Users className="w-6 h-6" />
          <span className="text-xs">Free for All</span>
        </Button>
        <Button
          type="button"
          variant={format === 'limited' ? 'default' : 'outline'}
          onClick={() => { setFormat('limited'); setSelectedProfiles([]); setWinnerProfileIds([]); }} // Changed to setSelectedProfiles, setWinnerProfileIds
          className="h-20 flex flex-col gap-2"
        >
          <Swords className="w-6 h-6" />
          <span className="text-xs">Limited</span>
        </Button>
      </div>

      {/* Player Selection */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg text-slate-100">Select Players</CardTitle>
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
                variant={selectedProfiles.includes(profile.id) ? 'default' : 'outline'} // Changed to selectedProfiles
                className={`justify-start px-2 h-auto py-2 ${
                  selectedProfiles.includes(profile.id) ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-slate-700'
                }`}
                onClick={() => toggleProfile(profile.id)} // Changed to toggleProfile
              >
                <div className="flex items-center gap-2 overflow-hidden w-full">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex-shrink-0">
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
      {selectedProfiles.length > 0 && ( // Changed to selectedProfiles
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-slate-100">Decks & Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedProfiles.map((profileId) => { // Changed to selectedProfiles, profileId
              const profile = players.find((p) => p.id === profileId); // Changed to profile
              if (!profile) return null;
              const isWinner = winnerProfileIds.includes(profileId); // Changed to winnerProfileIds, profileId

              return (
                <div key={profileId} className="flex flex-col gap-2 p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-200">{profile.display_name || profile.username || 'Player'}</span>
                    <Button
                      size="sm"
                      variant={isWinner ? 'default' : 'ghost'}
                      onClick={() => toggleWinner(profileId)} // Changed to toggleWinner, profileId
                      className={isWinner ? 'bg-emerald-500 hover:bg-emerald-600 text-black' : 'text-slate-500'}
                    >
                      {isWinner ? 'Winner 🏆' : 'Select as Winner'}
                    </Button>
                  </div>
                  
                   <Select 
                    value={selectedDecks[profileId] || ''} 
                    onValueChange={(val) => handleDeckChange(profileId, val)} // Changed to profileId
                   >
                    <SelectTrigger className="h-8 text-xs bg-slate-900 border-slate-700">
                        <SelectValue placeholder="Select Deck (Optional)" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                        {userDecks.map(deck => (
                            <SelectItem key={deck.id} value={deck.id}>{deck.name}</SelectItem>
                        ))}
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
        disabled={isSubmitting || selectedProfiles.length < 2 || winnerProfileIds.length === 0} // Changed to selectedProfiles, winnerProfileIds
        className="w-full h-12 text-lg bg-green-600 hover:bg-green-700 text-white"
      >
        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log Match'}
      </Button>
    </div>
  );
}