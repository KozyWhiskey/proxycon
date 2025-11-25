'use client';

import { useState } from 'react';
import { submitResult } from '@/app/tournament/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Player {
  id: string;
  name: string;
  nickname: string | null;
}

interface Participant {
  id: string;
  player_id: string;
  result: string | null;
  player: Player | undefined;
}

interface MatchReportingFormProps {
  tournamentId: string;
  matchId: string;
  participants: Participant[];
}

export default function MatchReportingForm({
  tournamentId,
  matchId,
  participants,
}: MatchReportingFormProps) {
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const player1 = participants[0];
  const player2 = participants[1];

  if (!player1 || !player2) {
    return <p className="text-slate-400">Invalid match participants</p>;
  }

  const handlePlayerClick = (playerId: string) => {
    setSelectedWinner(playerId);
  };

  const handleSubmit = async () => {
    if (!selectedWinner) {
      toast.error('Please select a winner');
      return;
    }

    const winner = selectedWinner === player1.player_id ? player1 : player2;
    const loser = selectedWinner === player1.player_id ? player2 : player1;

    setIsSubmitting(true);

    try {
      const result = await submitResult(matchId, winner.player_id, loser.player_id, tournamentId);
      
      if (!result.success) {
        toast.error(result.message || 'Failed to submit result');
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
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-2xl text-slate-100 mb-2">
          {player1.player?.nickname || player1.player?.name || 'Player 1'} vs.{' '}
          {player2.player?.nickname || player2.player?.name || 'Player 2'}
        </p>
        <p className="text-slate-400">Tap the winner</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card
          className={`cursor-pointer transition-all bg-slate-900 border-2 ${
            selectedWinner === player1.player_id
              ? 'border-yellow-500 bg-yellow-500/10'
              : 'border-slate-800 hover:border-yellow-500/50'
          }`}
          onClick={() => handlePlayerClick(player1.player_id)}
        >
          <CardContent className="p-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-100 mb-2">
                {player1.player?.nickname || player1.player?.name || 'Player 1'}
              </p>
              {selectedWinner === player1.player_id && (
                <p className="text-yellow-500 font-semibold">Selected as Winner</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all bg-slate-900 border-2 ${
            selectedWinner === player2.player_id
              ? 'border-yellow-500 bg-yellow-500/10'
              : 'border-slate-800 hover:border-yellow-500/50'
          }`}
          onClick={() => handlePlayerClick(player2.player_id)}
        >
          <CardContent className="p-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-100 mb-2">
                {player2.player?.nickname || player2.player?.name || 'Player 2'}
              </p>
              {selectedWinner === player2.player_id && (
                <p className="text-yellow-500 font-semibold">Selected as Winner</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedWinner && (
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-12 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Result'}
        </Button>
      )}
    </div>
  );
}

