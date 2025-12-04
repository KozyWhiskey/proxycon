'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { fixMatchResultWithGames } from '@/app/admin/actions';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { Minus, Plus } from 'lucide-react';

interface Match {
  id: string;
  tournament_id: string | null;
  round_number: number | null;
  game_type: string;
  created_at: string;
  participants: Array<{
    player_id: string;
    result: string | null;
    games_won: number;
    player: {
      id: string;
      name: string;
      nickname: string | null;
    };
  }>;
}

export default function FixMatchResult() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [player1Games, setPlayer1Games] = useState(0);
  const [player2Games, setPlayer2Games] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchMatches() {
      const supabase = createClient();
      const { data: recentMatches } = await supabase
        .from('matches')
        .select('id, tournament_id, round_number, game_type, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!recentMatches) {
        setIsLoading(false);
        return;
      }

      // Fetch participants for each match
      const matchesWithParticipants = await Promise.all(
        recentMatches.map(async (match) => {
          const { data: participants } = await supabase
            .from('match_participants')
            .select('player_id, result, games_won')
            .eq('match_id', match.id);

          if (!participants) return null;

          const playerIds = participants.map((p) => p.player_id);
          const { data: players } = await supabase
            .from('players')
            .select('id, name, nickname')
            .in('id', playerIds);

          const playersMap = new Map(players?.map((p) => [p.id, p]) || []);

          return {
            ...match,
            participants: participants.map((p) => ({
              ...p,
              games_won: p.games_won || 0,
              player: playersMap.get(p.player_id),
            })),
          };
        })
      );

      setMatches(matchesWithParticipants.filter((m) => m !== null) as Match[]);
      setIsLoading(false);
    }

    fetchMatches();
  }, []);

  const selectedMatch = matches.find((m) => m.id === selectedMatchId);

  // When a match is selected, initialize game scores from current values
  useEffect(() => {
    if (selectedMatch && selectedMatch.participants.length >= 2) {
      setPlayer1Games(selectedMatch.participants[0]?.games_won || 0);
      setPlayer2Games(selectedMatch.participants[1]?.games_won || 0);
    } else {
      setPlayer1Games(0);
      setPlayer2Games(0);
    }
  }, [selectedMatch]);

  // Determine result based on game scores
  const getResultPreview = () => {
    if (!selectedMatch || selectedMatch.participants.length < 2) return null;
    
    const player1 = selectedMatch.participants[0];
    const player2 = selectedMatch.participants[1];
    const player1Name = player1?.player?.nickname || player1?.player?.name || 'Player 1';
    const player2Name = player2?.player?.nickname || player2?.player?.name || 'Player 2';

    if (player1Games === player2Games) {
      return { type: 'draw', text: `Draw ${player1Games}-${player2Games}` };
    } else if (player1Games > player2Games) {
      return { type: 'win', text: `${player1Name} wins ${player1Games}-${player2Games}` };
    } else {
      return { type: 'win', text: `${player2Name} wins ${player2Games}-${player1Games}` };
    }
  };

  const handleSubmit = async () => {
    if (!selectedMatch || selectedMatch.participants.length < 2) {
      toast.error('Please select a valid match');
      return;
    }

    setIsSubmitting(true);

    const player1Id = selectedMatch.participants[0].player_id;
    const player2Id = selectedMatch.participants[1].player_id;

    const result = await fixMatchResultWithGames(
      selectedMatchId,
      player1Id,
      player2Id,
      player1Games,
      player2Games
    );

    if (result.success) {
      toast.success(result.message || 'Match result updated successfully');
      setSelectedMatchId('');
      setPlayer1Games(0);
      setPlayer2Games(0);
      // Refresh matches
      window.location.reload();
    } else {
      toast.error(result.message || 'Failed to update match result');
      setIsSubmitting(false);
    }
  };

  const resultPreview = getResultPreview();

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-6">
          <p className="text-slate-400 text-center">Loading matches...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100">Fix Match Result</CardTitle>
        <CardDescription className="text-slate-400">
          Change the result and game scores of a match
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-slate-100">Select Match</Label>
          <Select value={selectedMatchId} onValueChange={setSelectedMatchId}>
            <SelectTrigger className="w-full h-12 bg-slate-800 border-slate-700 text-slate-100">
              <SelectValue placeholder="Choose a match..." />
            </SelectTrigger>
            <SelectContent>
              {matches.map((match) => {
                const participants = match.participants
                  .map((p) => p.player?.nickname || p.player?.name || 'Unknown')
                  .join(' vs ');
                const matchLabel = match.tournament_id
                  ? `Round ${match.round_number} - ${participants}`
                  : `${match.game_type} - ${participants}`;
                return (
                  <SelectItem key={match.id} value={match.id}>
                    {matchLabel}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {selectedMatch && selectedMatch.participants.length >= 2 && (
          <>
            {/* Current Results */}
            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
              <p className="text-sm text-slate-400 mb-2">Current Results:</p>
              <div className="space-y-1">
                {selectedMatch.participants.map((p) => (
                  <div key={p.player_id} className="text-slate-100 flex justify-between">
                    <span>{p.player?.nickname || p.player?.name || 'Unknown'}</span>
                    <span className="text-slate-400">
                      {p.result || 'pending'} ({p.games_won} games)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Game Score Inputs */}
            <div className="space-y-4">
              <Label className="text-slate-100">New Game Scores</Label>
              
              {/* Player 1 */}
              <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-700">
                <span className="text-slate-100 font-medium">
                  {selectedMatch.participants[0]?.player?.nickname || 
                   selectedMatch.participants[0]?.player?.name || 'Player 1'}
                </span>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 bg-slate-700 border-slate-600 hover:bg-slate-600"
                    onClick={() => setPlayer1Games(Math.max(0, player1Games - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-2xl font-bold text-slate-100 w-8 text-center">
                    {player1Games}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 bg-slate-700 border-slate-600 hover:bg-slate-600"
                    onClick={() => setPlayer1Games(Math.min(2, player1Games + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Player 2 */}
              <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-700">
                <span className="text-slate-100 font-medium">
                  {selectedMatch.participants[1]?.player?.nickname || 
                   selectedMatch.participants[1]?.player?.name || 'Player 2'}
                </span>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 bg-slate-700 border-slate-600 hover:bg-slate-600"
                    onClick={() => setPlayer2Games(Math.max(0, player2Games - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-2xl font-bold text-slate-100 w-8 text-center">
                    {player2Games}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 bg-slate-700 border-slate-600 hover:bg-slate-600"
                    onClick={() => setPlayer2Games(Math.min(2, player2Games + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Result Preview */}
            {resultPreview && (
              <div className={`p-4 rounded-lg border text-center font-semibold ${
                resultPreview.type === 'draw' 
                  ? 'bg-amber-900/30 border-amber-700 text-amber-400'
                  : 'bg-emerald-900/30 border-emerald-700 text-emerald-400'
              }`}>
                {resultPreview.text}
              </div>
            )}
          </>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!selectedMatchId || !selectedMatch || selectedMatch.participants.length < 2 || isSubmitting}
          className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white font-semibold disabled:opacity-50"
        >
          {isSubmitting ? 'Updating...' : 'Update Match Result'}
        </Button>
      </CardContent>
    </Card>
  );
}
