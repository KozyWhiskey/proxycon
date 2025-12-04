'use client';

import { useState } from 'react';
import { submitResultWithGames } from '@/app/tournament/actions';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Minus, Plus } from 'lucide-react';

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
  const [player1Games, setPlayer1Games] = useState(0);
  const [player2Games, setPlayer2Games] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const player1 = participants[0];
  const player2 = participants[1];

  if (!player1 || !player2) {
    return <p className="text-slate-400">Invalid match participants</p>;
  }

  const player1Name = player1.player?.nickname || player1.player?.name || 'Player 1';
  const player2Name = player2.player?.nickname || player2.player?.name || 'Player 2';

  // Determine result from game scores
  const getResultPreview = () => {
    if (player1Games === player2Games) {
      if (player1Games === 0) {
        return { text: 'Enter game scores', color: 'text-slate-400', type: 'none' };
      }
      return { text: `Draw (${player1Games}-${player2Games})`, color: 'text-blue-400', type: 'draw' };
    }
    if (player1Games > player2Games) {
      return { text: `${player1Name} wins ${player1Games}-${player2Games}`, color: 'text-green-400', type: 'player1' };
    }
    return { text: `${player2Name} wins ${player2Games}-${player1Games}`, color: 'text-green-400', type: 'player2' };
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
      const isDraw = player1Games === player2Games;
      const winnerId = player1Games > player2Games ? player1.player_id : player2.player_id;
      const loserId = player1Games > player2Games ? player2.player_id : player1.player_id;

      const response = await submitResultWithGames(
        matchId,
        isDraw ? null : winnerId,
        isDraw ? null : loserId,
        player1.player_id,
        player1Games,
        player2.player_id,
        player2Games,
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
          <p className="text-slate-100 font-semibold text-lg truncate px-2">
            {player1Name}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              onClick={() => setPlayer1Games(Math.max(0, player1Games - 1))}
              disabled={isSubmitting || player1Games === 0}
              className="h-12 w-12 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 disabled:opacity-30"
            >
              <Minus className="w-5 h-5" />
            </Button>
            <span className="text-5xl font-bold text-yellow-500 w-16 text-center tabular-nums">
              {player1Games}
            </span>
            <Button
              type="button"
              onClick={() => setPlayer1Games(player1Games + 1)}
              disabled={isSubmitting}
              className="h-12 w-12 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-slate-500">Games Won</p>
        </div>

        {/* VS Divider */}
        <div className="text-center">
          <span className="text-3xl font-bold text-slate-600">vs</span>
        </div>

        {/* Player 2 */}
        <div className="text-center space-y-3">
          <p className="text-slate-100 font-semibold text-lg truncate px-2">
            {player2Name}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              onClick={() => setPlayer2Games(Math.max(0, player2Games - 1))}
              disabled={isSubmitting || player2Games === 0}
              className="h-12 w-12 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 disabled:opacity-30"
            >
              <Minus className="w-5 h-5" />
            </Button>
            <span className="text-5xl font-bold text-yellow-500 w-16 text-center tabular-nums">
              {player2Games}
            </span>
            <Button
              type="button"
              onClick={() => setPlayer2Games(player2Games + 1)}
              disabled={isSubmitting}
              className="h-12 w-12 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-slate-500">Games Won</p>
        </div>
      </div>

      {/* Result Preview */}
      <div className={`text-center p-4 bg-slate-800/50 rounded-lg border border-slate-700 ${result.color}`}>
        <p className="text-lg font-medium">{result.text}</p>
      </div>

      {/* Submit Button */}
      {canSubmit && (
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full h-14 font-semibold text-lg disabled:opacity-50 ${
            result.type === 'draw'
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-yellow-500 hover:bg-yellow-600 text-slate-950'
          }`}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Result'}
        </Button>
      )}

      {/* Points Information */}
      <div className="text-center space-y-1">
        <p className="text-xs text-slate-500">
          Win: 3 points • Draw: 2 points each • Loss: 1 point
        </p>
        <p className="text-xs text-slate-600">
          Game wins are used as a tiebreaker
        </p>
      </div>
    </div>
  );
}
