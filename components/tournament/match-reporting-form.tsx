'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { submitResultWithGamesNoRedirect } from '@/app/tournament/actions';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Minus, Plus, RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Deck } from '@/lib/types';
import { cn } from '@/lib/utils';

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
  userDecks: Deck[]; 
  player1ProfileId?: string; 
  player2ProfileId?: string; 
  format?: string; 
}

export default function MatchReportingForm({
  tournamentId,
  matchId,
  participants,
  userDecks,
  player1ProfileId,
  player2ProfileId,
  format,
}: MatchReportingFormProps) {
  const router = useRouter();
  const [player1Games, setPlayer1Games] = useState(0);
  const [player2Games, setPlayer2Games] = useState(0);
  const [player1DeckId, setPlayer1DeckId] = useState<string | null>(null);
  const [player2DeckId, setPlayer2DeckId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const player1 = participants[0];
  const player2 = participants[1];

  if (!player1 || !player2) {
    return <p className="text-muted-foreground text-center">Invalid match participants</p>;
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
      const p1Id = player1.profile_id;
      const p2Id = player2.profile_id;

      const response = await submitResultWithGamesNoRedirect(
        matchId,
        p1Id, player1Games, player1DeckId === 'none' ? null : player1DeckId,
        p2Id, player2Games, player2DeckId === 'none' ? null : player2DeckId,
        tournamentId
      );

      if (!response.success) {
        toast.error(response.message || 'Failed to submit result');
        setIsSubmitting(false);
        return;
      }

      if (response.awardedBadges && response.awardedBadges.length > 0) {
        response.awardedBadges.forEach((badge) => {
          toast(`Badge Unlocked: ${badge.name}`, {
            description: badge.description,
            icon: badge.icon_url || '🏆',
            duration: 5000,
          });
        });
      } else {
        toast.success('Result submitted');
      }

      if (response.nextRoundGenerated) {
        router.push(`/tournament/${tournamentId}?roundGenerated=true`);
      } else {
        router.push(`/tournament/${tournamentId}`);
      }
      router.refresh();

    } catch (error) {
      console.error('Error submitting result:', error);
      toast.error('An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel p-6 md:p-8 rounded-xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Game Score Entry */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        
        {/* Player 1 */}
        <div className="text-center space-y-4">
          <p className="text-foreground font-bold text-xl truncate px-2 font-heading tracking-tight">
            {player1Name}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              type="button"
              onClick={() => setPlayer1Games(Math.max(0, player1Games - 1))}
              disabled={isSubmitting || player1Games === 0}
              variant="outline"
              size="icon"
              className="h-14 w-14 rounded-full border-white/10 hover:bg-white/10"
            >
              <Minus className="w-6 h-6" />
            </Button>
            <span className={cn(
              "text-6xl font-bold font-mono w-20 text-center tabular-nums transition-all",
              player1Games > player2Games ? "text-emerald-500 text-glow" : "text-foreground"
            )}>
              {player1Games}
            </span>
            <Button
              type="button"
              onClick={() => setPlayer1Games(player1Games + 1)}
              disabled={isSubmitting}
              variant="outline"
              size="icon"
              className="h-14 w-14 rounded-full border-white/10 hover:bg-white/10"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Games Won</p>

          {player1ProfileId && userDecks.length > 0 && format !== 'draft' && format !== 'sealed' && (
            <div className="mt-4">
              <Select onValueChange={setPlayer1DeckId} value={player1DeckId || ''}>
                <SelectTrigger className="w-full bg-secondary/50 border-white/10">
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
        </div>

        {/* VS Divider */}
        <div className="text-center md:py-0 py-4">
          <span className="text-4xl font-black text-muted-foreground/20 font-heading">VS</span>
        </div>

        {/* Player 2 */}
        <div className="text-center space-y-4">
          <p className="text-foreground font-bold text-xl truncate px-2 font-heading tracking-tight">
            {player2Name}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              type="button"
              onClick={() => setPlayer2Games(Math.max(0, player2Games - 1))}
              disabled={isSubmitting || player2Games === 0}
              variant="outline"
              size="icon"
              className="h-14 w-14 rounded-full border-white/10 hover:bg-white/10"
            >
              <Minus className="w-6 h-6" />
            </Button>
            <span className={cn(
              "text-6xl font-bold font-mono w-20 text-center tabular-nums transition-all",
              player2Games > player1Games ? "text-emerald-500 text-glow" : "text-foreground"
            )}>
              {player2Games}
            </span>
            <Button
              type="button"
              onClick={() => setPlayer2Games(player2Games + 1)}
              disabled={isSubmitting}
              variant="outline"
              size="icon"
              className="h-14 w-14 rounded-full border-white/10 hover:bg-white/10"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Games Won</p>
          
          {player2ProfileId && userDecks.length > 0 && format !== 'draft' && format !== 'sealed' && (
            <div className="mt-4">
              <Select onValueChange={setPlayer2DeckId} value={player2DeckId || 'none'}>
                <SelectTrigger className="w-full bg-secondary/50 border-white/10">
                  <SelectValue placeholder="Select Deck" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-muted-foreground">No Deck Selected</SelectItem>
                  {userDecks.map((deck) => (
                    <SelectItem key={deck.id} value={deck.id}>
                      {deck.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Result Preview & Action */}
      <div className="pt-6 border-t border-white/5 space-y-4">
        <div className={cn(
          "text-center p-4 rounded-lg border transition-colors duration-300",
          result.color === "text-emerald-500" ? "bg-emerald-500/10 border-emerald-500/20" : 
          result.type === "draw" ? "bg-primary/10 border-primary/20" :
          "bg-secondary/30 border-white/5"
        )}>
          <p className={cn("text-lg font-bold font-heading", result.color)}>{result.text}</p>
        </div>

        {canSubmit && (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-14 font-bold text-lg shadow-lg hover:scale-[1.01] transition-all"
            variant={result.type === 'draw' ? 'secondary' : 'default'}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Confirm Result'
            )}
          </Button>
        )}

        <div className="text-center space-y-1 pt-2">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">
            Win: 3pts • Draw: 1pt • Loss: 0pts
          </p>
        </div>
      </div>
    </div>
  );
}
