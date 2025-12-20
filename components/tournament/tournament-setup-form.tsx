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
// import { Trophy } from 'lucide-react'; // No longer needed as prize section is removed

interface Player {
  id: string;
  display_name: string | null;
  username: string | null;
}

interface TournamentSetupFormProps {
  players: Player[];
  eventId?: string; // Added eventId prop
}

export default function TournamentSetupForm({ players, eventId }: TournamentSetupFormProps) {
  const [tournamentName, setTournamentName] = useState('');
  const [format, setFormat] = useState('draft');
  const [maxRounds, setMaxRounds] = useState('3');
  const [roundDuration, setRoundDuration] = useState('50');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  // const [prize1st, setPrize1st] = useState(''); // Removed prize state
  // const [prize2nd, setPrize2nd] = useState('');
  // const [prize3rd, setPrize3rd] = useState('');
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

    setIsSubmitting(true);

    try {
      const result = await createTournament(
        tournamentName, 
        selectedPlayers, 
        format, 
        parseInt(maxRounds, 10),
        parseInt(roundDuration, 10),
        // prize1st.trim() || undefined, // Removed prize args
        // prize2nd.trim() || undefined,
        // prize3rd.trim() || undefined,
        eventId // Pass eventId to action
      );
      
      if (!result.success) {
        toast.error(result.message || 'Failed to create tournament');
        setIsSubmitting(false);
      }
      // If successful, the server action will redirect, so we don't need to handle success here
      // Note: redirect() throws an error to perform the redirect, which is expected behavior
    } catch (error) {
      // Check if this is a redirect error (expected behavior)
      if (error && typeof error === 'object' && 'digest' in error) {
        const digest = (error as { digest?: string }).digest;
        if (digest?.startsWith('NEXT_REDIRECT')) {
          // This is expected - redirect() throws to perform redirect
          // Don't show error or reset state, just let the redirect happen
          return;
        }
      }
      
      // Only show error for actual errors, not redirects
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
              </SelectContent>
            </Select>
          </div>

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