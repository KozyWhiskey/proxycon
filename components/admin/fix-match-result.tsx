'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { fixMatchResultWithGames } from '@/app/admin/actions';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { Minus, Plus, RefreshCw } from 'lucide-react';

interface Match {
  id: string;
  tournament_id: string | null;
  round_number: number | null;
  game_type: string;
  created_at: string;
  participants: Array<{
    profile_id: string;
    result: string | null;
    games_won: number;
    profile: {
      id: string;
      username: string;
      display_name: string | null;
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
            .select('profile_id, result, games_won')
            .eq('match_id', match.id);

          if (!participants) return null;

          const profileIds = participants.map((p) => p.profile_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, display_name')
            .in('id', profileIds);

          const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);

          return {
            ...match,
            participants: participants.map((p) => ({
              ...p,
              games_won: p.games_won || 0,
              profile: profilesMap.get(p.profile_id),
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
    const player1Name = player1?.profile?.display_name || player1?.profile?.username || 'Player 1';
    const player2Name = player2?.profile?.display_name || player2?.profile?.username || 'Player 2';

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

    const player1Id = selectedMatch.participants[0].profile_id;
    const player2Id = selectedMatch.participants[1].profile_id;

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
      <Card className="glass-panel">
        <CardContent className="p-12 flex flex-col items-center justify-center">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground text-center italic">Scanning historical records...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-panel">
      <CardHeader className="border-b border-white/5 pb-6">
        <CardTitle className="text-xl text-foreground font-heading tracking-wide">Fix Match Result</CardTitle>
        <CardDescription className="text-muted-foreground/60 text-xs uppercase tracking-widest">
          System Administration Override
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-8">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest px-1 font-heading">Select Match</Label>
          <Select value={selectedMatchId} onValueChange={setSelectedMatchId}>
            <SelectTrigger className="w-full h-12 bg-white/5 border-white/10 text-foreground">
              <SelectValue placeholder="Choose a match..." />
            </SelectTrigger>
            <SelectContent>
              {matches.map((match) => {
                const participants = match.participants
                  .map((p) => p.profile?.display_name || p.profile?.username || 'Unknown')
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
            <div className="p-4 bg-white/5 rounded-lg border border-white/5">
              <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mb-3">Currently Stored:</p>
              <div className="space-y-2">
                {selectedMatch.participants.map((p) => (
                  <div key={p.profile_id} className="text-foreground flex justify-between items-center">
                    <span className="text-sm font-medium">{p.profile?.display_name || p.profile?.username || 'Unknown'}</span>
                    <span className={`text-xs uppercase font-bold px-2 py-0.5 rounded border ${
                      p.result === 'win' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      p.result === 'loss' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                      'bg-zinc-800 text-muted-foreground border-white/5'
                    }`}>
                      {p.result || 'pending'} <span className="opacity-40 mx-1">•</span> {p.games_won}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Game Score Inputs */}
            <div className="space-y-4">
              <Label className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest px-1 font-heading">Set Correct Scores</Label>
              
              {/* Player 1 */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                <span className="text-foreground font-medium text-sm">
                  {selectedMatch.participants[0]?.profile?.display_name || 
                   selectedMatch.participants[0]?.profile?.username || 'Player 1'}
                </span>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 bg-zinc-800 border-white/5 hover:bg-zinc-700"
                    onClick={() => setPlayer1Games(Math.max(0, player1Games - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-2xl font-bold text-primary w-8 text-center tabular-nums">
                    {player1Games}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 bg-zinc-800 border-white/5 hover:bg-zinc-700"
                    onClick={() => setPlayer1Games(Math.min(2, player1Games + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Player 2 */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                <span className="text-foreground font-medium text-sm">
                  {selectedMatch.participants[1]?.profile?.display_name || 
                   selectedMatch.participants[1]?.profile?.username || 'Player 2'}
                </span>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 bg-zinc-800 border-white/5 hover:bg-zinc-700"
                    onClick={() => setPlayer2Games(Math.max(0, player2Games - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-2xl font-bold text-primary w-8 text-center tabular-nums">
                    {player2Games}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 bg-zinc-800 border-white/5 hover:bg-zinc-700"
                    onClick={() => setPlayer2Games(Math.min(2, player2Games + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Result Preview */}
            {resultPreview && (
              <div className={`p-4 rounded-lg border text-center font-bold uppercase tracking-widest text-xs ${
                resultPreview.type === 'draw' 
                  ? 'bg-primary/10 border-primary/20 text-primary'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
              }`}>
                {resultPreview.text}
              </div>
            )}
          </>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!selectedMatchId || !selectedMatch || selectedMatch.participants.length < 2 || isSubmitting}
          className="w-full h-14 bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(225,29,72,0.3)] hover:shadow-[0_0_20px_rgba(225,29,72,0.5)] disabled:opacity-50 font-heading"
        >
          {isSubmitting ? 'Correcting Record...' : 'Overwrite Match Result'}
        </Button>
      </CardContent>
    </Card>
  );
}
