'use client';

import { useState } from 'react';
import { createTournament } from '@/app/tournament/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PlayerSelector from './player-selector';
import { toast } from 'sonner';
import { ScryfallSet } from '@/lib/scryfall';
// import { Trophy } from 'lucide-react'; // No longer needed as prize section is removed

interface Player {
  id: string;
  display_name: string | null;
  username: string | null;
}

interface TournamentSetupFormProps {
  players: Player[];
  eventId?: string; // Added eventId prop
  sets: ScryfallSet[];
}

export default function TournamentSetupForm({ players, eventId, sets }: TournamentSetupFormProps) {
  const [tournamentName, setTournamentName] = useState('');
  const [format, setFormat] = useState('draft');
  const [maxRounds, setMaxRounds] = useState('3');
  const [roundDuration, setRoundDuration] = useState('50');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedSetCode, setSelectedSetCode] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tournamentName.trim()) {
      toast.error('Please enter a tournament name');
      return;
    }

    if (selectedPlayers.length < 2) {
      toast.error('Please select at least 2 players');
      return;
    }

    if (format !== 'constructed' && !selectedSetCode) {
         toast.error('Please select a Set for Limited format');
         return;
    }

    setIsSubmitting(true);
    
    const selectedSet = sets.find(s => s.code === selectedSetCode);

    try {
      const result = await createTournament(
        tournamentName, 
        selectedPlayers, 
        format, 
        parseInt(maxRounds, 10),
        parseInt(roundDuration, 10),
        eventId,
        selectedSet?.code,
        selectedSet?.name
      );
      
      if (!result.success) {
        toast.error(result.message || 'Failed to create tournament');
        setIsSubmitting(false);
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'digest' in error) {
        const digest = (error as { digest?: string }).digest;
        if (digest?.startsWith('NEXT_REDIRECT')) {
          return;
        }
      }
      
      console.error('Error creating tournament:', error);
      toast.error('An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="font-heading">Tournament Setup</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">
              Tournament Name
            </Label>
            <Input
              id="name"
              type="text"
              value={tournamentName}
              onChange={(e) => setTournamentName(e.target.value)}
              placeholder="e.g., Friday Night Draft"
              className="h-12"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">
              Format
            </Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sealed">Sealed</SelectItem>
                <SelectItem value="constructed">Constructed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(format === 'draft' || format === 'sealed') && (
            <div className="space-y-2">
              <Label htmlFor="set">
                Expansion Set
              </Label>
              <Select value={selectedSetCode} onValueChange={setSelectedSetCode}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select a set..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {sets.map((set) => (
                    <SelectItem key={set.id} value={set.code}>
                      <span className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={set.icon_svg_uri} alt="" className="w-4 h-4 invert opacity-70" />
                        {set.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="rounds">
              Number of Rounds
            </Label>
            <Select value={maxRounds} onValueChange={setMaxRounds}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 Rounds</SelectItem>
                <SelectItem value="4">4 Rounds</SelectItem>
                <SelectItem value="5">5 Rounds</SelectItem>
                <SelectItem value="6">6 Rounds</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">
              Round Duration (minutes)
            </Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="300"
              value={roundDuration}
              onChange={(e) => setRoundDuration(e.target.value)}
              placeholder="50"
              className="h-12"
              required
            />
          </div>

          <PlayerSelector
            players={players}
            selectedPlayers={selectedPlayers}
            onSelectionChange={setSelectedPlayers}
          />

          <Button
            type="submit"
            disabled={isSubmitting || selectedPlayers.length < 2}
            className="w-full h-12 font-semibold disabled:opacity-50"
            variant="default"
          >
            {isSubmitting ? 'Creating...' : 'Start Tournament'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}