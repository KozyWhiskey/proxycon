'use client';

import { useState } from 'react';
import Link from 'next/link';
import { submitResultWithGames } from '@/app/tournament/actions';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Minus, Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Deck } from '@/lib/types'; // Import Deck type

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
}

interface Participant {
  id: string;
  profile_id: string;
  result: string | null;
  profile: Profile | undefined;
}

interface MatchReportingFormProps {
  tournamentId: string;
  matchId: string;
  participants: Participant[];
  userDecks: Deck[]; // New prop: list of current user's decks
  player1ProfileId?: string; // New prop: profile_id of player1 if they are the current user
  player2ProfileId?: string; // New prop: profile_id of player2 if they are the current user
}

export default function MatchReportingForm({
  tournamentId,
  matchId,
  participants,
  userDecks,
  player1ProfileId,
  player2ProfileId,
}: MatchReportingFormProps) {
  const [player1Games, setPlayer1Games] = useState(0);
  const [player2Games, setPlayer2Games] = useState(0);
  const [player1DeckId, setPlayer1DeckId] = useState<string | null>(null);
  const [player2DeckId, setPlayer2DeckId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const player1 = participants[0];
  const player2 = participants[1];

  if (!player1 || !player2) {
    return <p className="text-slate-400">Invalid match participants</p>;
  }

  const player1Name = player1.profile?.display_name || player1.profile?.username || 'Player 1';
  const player2Name = player2.profile?.display_name || player2.profile?.username || 'Player 2';

  // Determine result from game scores
  const getResultPreview = () => {
    if (player1Games === player2Games) {
      if (player1Games === 0) {
        return { text: 'Enter game scores', color: 'text-muted-foreground', type: 'none' };
      }
      return { text: `Draw (${player1Games}-${player2Games})`, color: 'text-primary', type: 'draw' };
    }
    if (player1Games > player2Games) {
      return { text: `${player1Name} wins ${player1Games}-${player2Games}`, color: 'text-emerald-500', type: 'player1' };
    }
    return { text: `${player2Name} wins ${player2Games}-${player1Games}`, color: 'text-emerald-500', type: 'player2' };
  };

  const result = getResultPreview();
  const canSubmit = player1Games > 0 || player2Games > 0;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error('Please enter at least one game win');
      return;
    }

    setIsSubmitting(true);

    try {
      // Invert logic for clarity on who is "player1" and "player2" in action
      const p1Id = player1.profile_id;
      const p2Id = player2.profile_id;

      const response = await submitResultWithGames(
        matchId,
        p1Id, player1Games, player1DeckId,
        p2Id, player2Games, player2DeckId,
        tournamentId
      );

      if (!response.success) {
        toast.error(response.message || 'Failed to submit result');
        setIsSubmitting(false);
      }
      // If successful, the server action will redirect
    } catch (error) {
      // Check if this is a redirect error (expected behavior)
      if (error && typeof error === 'object' && 'digest' in error) {
        const digest = (error as { digest?: string }).digest;
        if (digest?.startsWith('NEXT_REDIRECT')) {
          // This is expected - redirect() throws to perform redirect
          return;
        }
      }

      console.error('Error submitting result:', error);
      toast.error('An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Game Score Entry */}
      <div className="grid grid-cols-3 gap-4 items-center">
        {/* Player 1 */}
        <div className="text-center space-y-3">
          <p className="text-foreground font-semibold text-lg truncate px-2 font-heading">
            {player1Name}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              onClick={() => setPlayer1Games(Math.max(0, player1Games - 1))}
              disabled={isSubmitting || player1Games === 0}
              variant="outline"
              className="h-12 w-12 rounded-full border-white/10"
            >
              <Minus className="w-5 h-5" />
            </Button>
            <span className="text-5xl font-bold text-primary text-glow w-16 text-center tabular-nums">
              {player1Games}
            </span>
            <Button
              type="button"
              onClick={() => setPlayer1Games(player1Games + 1)}
              disabled={isSubmitting}
              variant="outline"
              className="h-12 w-12 rounded-full border-white/10"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Games Won</p>

          {player1ProfileId && userDecks.length > 0 && (
            <div className="mt-4">
              <Select onValueChange={setPlayer1DeckId} value={player1DeckId || ''}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Deck" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-muted-foreground">No Deck Selected</SelectItem>
                  {userDecks.map((deck) => (
                    <SelectItem key={deck.id} value={deck.id}>
                      {deck.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
           {player1ProfileId && userDecks.length === 0 && (
             <p className="text-xs text-muted-foreground mt-2">No decks found. <Link href="/decks" className="underline hover:text-white">Create one?</Link></p>
           )}
        </div>

        {/* VS Divider */}
        <div className="text-center">
          <span className="text-3xl font-bold text-muted-foreground font-heading">vs</span>
        </div>

        {/* Player 2 */}
        <div className="text-center space-y-3">
          <p className="text-foreground font-semibold text-lg truncate px-2 font-heading">
            {player2Name}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              onClick={() => setPlayer2Games(Math.max(0, player2Games - 1))}
              disabled={isSubmitting || player2Games === 0}
              variant="outline"
              className="h-12 w-12 rounded-full border-white/10"
            >
              <Minus className="w-5 h-5" />
            </Button>
            <span className="text-5xl font-bold text-primary text-glow w-16 text-center tabular-nums">
              {player2Games}
            </span>
            <Button
              type="button"
              onClick={() => setPlayer2Games(player2Games + 1)}
              disabled={isSubmitting}
              variant="outline"
              className="h-12 w-12 rounded-full border-white/10"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Games Won</p>
          {player2ProfileId && userDecks.length > 0 && (
            <div className="mt-4">
              <Select onValueChange={setPlayer2DeckId} value={player2DeckId || ''}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Deck" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-muted-foreground">No Deck Selected</SelectItem>
                  {userDecks.map((deck) => (
                    <SelectItem key={deck.id} value={deck.id}>
                      {deck.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {player2ProfileId && userDecks.length === 0 && (
             <p className="text-xs text-muted-foreground mt-2">No decks found. <Link href="/decks" className="underline hover:text-white">Create one?</Link></p>
           )}
        </div>
      </div>

      {/* Result Preview */}
      <div className={`text-center p-4 bg-white/5 rounded-lg border border-white/10 ${result.color}`}>
        <p className="text-lg font-medium font-heading">{result.text}</p>
      </div>

      {/* Submit Button */}
      {canSubmit && (
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-14 font-semibold text-lg disabled:opacity-50"
          variant={result.type === 'draw' ? 'secondary' : 'default'}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Result'}
        </Button>
      )}

      {/* Points Information */}
      <div className="text-center space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-widest">
          Win: 3pts • Draw: 1pt • Loss: 0pts
        </p>
        <p className="text-[10px] text-muted-foreground/40">
          Game wins are used as a tiebreaker
        </p>
      </div>
    </div>
  );
}