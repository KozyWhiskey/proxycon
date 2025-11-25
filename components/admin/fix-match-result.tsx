'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { fixMatchResult } from '@/app/admin/actions';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';

interface Match {
  id: string;
  tournament_id: string | null;
  round_number: number | null;
  game_type: string;
  created_at: string;
  participants: Array<{
    player_id: string;
    result: string | null;
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
  const [selectedWinnerId, setSelectedWinnerId] = useState<string>('');
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
            .select('player_id, result')
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

  const handleSubmit = async () => {
    if (!selectedMatchId || !selectedWinnerId) {
      toast.error('Please select a match and new winner');
      return;
    }

    setIsSubmitting(true);
    const result = await fixMatchResult(selectedMatchId, selectedWinnerId);

    if (result.success) {
      toast.success(result.message || 'Match result updated successfully');
      setSelectedMatchId('');
      setSelectedWinnerId('');
      // Refresh matches
      window.location.reload();
    } else {
      toast.error(result.message || 'Failed to update match result');
      setIsSubmitting(false);
    }
  };

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
          Change the winner of a match and update player records
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

        {selectedMatch && (
          <>
            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
              <p className="text-sm text-slate-400 mb-2">Current Participants:</p>
              <div className="space-y-1">
                {selectedMatch.participants.map((p) => (
                  <div key={p.player_id} className="text-slate-100">
                    {p.player?.nickname || p.player?.name || 'Unknown'} -{' '}
                    <span className="text-slate-400">{p.result || 'No result'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-100">New Winner</Label>
              <Select value={selectedWinnerId} onValueChange={setSelectedWinnerId}>
                <SelectTrigger className="w-full h-12 bg-slate-800 border-slate-700 text-slate-100">
                  <SelectValue placeholder="Choose new winner..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedMatch.participants.map((p) => (
                    <SelectItem key={p.player_id} value={p.player_id}>
                      {p.player?.nickname || p.player?.name || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!selectedMatchId || !selectedWinnerId || isSubmitting}
          className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white font-semibold disabled:opacity-50"
        >
          {isSubmitting ? 'Updating...' : 'Update Match Result'}
        </Button>
      </CardContent>
    </Card>
  );
}

