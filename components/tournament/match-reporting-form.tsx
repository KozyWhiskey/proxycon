'use client';

import { useState } from 'react';
import { submitResult, submitDraw } from '@/app/tournament/actions';
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
  const [selectedDraw, setSelectedDraw] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const player1 = participants[0];
  const player2 = participants[1];

  if (!player1 || !player2) {
    return <p className="text-slate-400">Invalid match participants</p>;
  }

  const handlePlayerClick = (playerId: string) => {
    setSelectedWinner(playerId);
    setSelectedDraw(false);
  };

  const handleDrawClick = () => {
    setSelectedDraw(true);
    setSelectedWinner(null);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      if (selectedDraw) {
        const result = await submitDraw(
          matchId,
          [player1.player_id, player2.player_id],
          tournamentId
        );
        
        if (!result.success) {
          toast.error(result.message || 'Failed to submit draw');
          setIsSubmitting(false);
        }
      } else if (selectedWinner) {
        const winner = selectedWinner === player1.player_id ? player1 : player2;
        const loser = selectedWinner === player1.player_id ? player2 : player1;

        const result = await submitResult(matchId, winner.player_id, loser.player_id, tournamentId);
        
        if (!result.success) {
          toast.error(result.message || 'Failed to submit result');
          setIsSubmitting(false);
        }
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

  const hasSelection = selectedWinner !== null || selectedDraw;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-2xl text-slate-100 mb-2">
          {player1.player?.nickname || player1.player?.name || 'Player 1'} vs.{' '}
          {player2.player?.nickname || player2.player?.name || 'Player 2'}
        </p>
        <p className="text-slate-400">Select the winner</p>
      </div>

      {/* Player Selection */}
      <div className="grid grid-cols-1 gap-4">
        <Button
          onClick={() => handlePlayerClick(player1.player_id)}
          disabled={isSubmitting}
          className={`w-full h-16 border-2 font-semibold disabled:opacity-50 text-xl ${
            selectedWinner === player1.player_id
              ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500'
              : 'bg-slate-900 border-slate-800 hover:border-yellow-500/50 hover:bg-slate-800 text-slate-100'
          }`}
        >
          {player1.player?.nickname || player1.player?.name || 'Player 1'}
        </Button>

        <Button
          onClick={() => handlePlayerClick(player2.player_id)}
          disabled={isSubmitting}
          className={`w-full h-16 border-2 font-semibold disabled:opacity-50 text-xl ${
            selectedWinner === player2.player_id
              ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500'
              : 'bg-slate-900 border-slate-800 hover:border-yellow-500/50 hover:bg-slate-800 text-slate-100'
          }`}
        >
          {player2.player?.nickname || player2.player?.name || 'Player 2'}
        </Button>

        <Button
          onClick={handleDrawClick}
          disabled={isSubmitting}
          className={`w-full h-16 border-2 font-semibold disabled:opacity-50 text-xl mt-4 ${
            selectedDraw
              ? 'bg-blue-500/20 border-blue-500 text-blue-500'
              : 'bg-slate-900 border-slate-800 hover:border-blue-500/50 hover:bg-slate-800 text-slate-100'
          }`}
        >
          Draw
        </Button>
      </div>

      {/* Submit Button - Only show when selection is made */}
      {hasSelection && (
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full h-12 font-semibold disabled:opacity-50 ${
            selectedDraw
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-yellow-500 hover:bg-yellow-600 text-slate-950'
          }`}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Result'}
        </Button>
      )}

      {/* Points Information */}
      <p className="text-xs text-slate-500 text-center mt-4">
        Win: 3 points • Draw: 2 points each • Loss: 1 point
      </p>
    </div>
  );
}

