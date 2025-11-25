import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import RoundGeneratedToast from '@/components/tournament/round-generated-toast';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TournamentPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch tournament
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select('id, name, format, status, max_rounds')
    .eq('id', id)
    .single();

  if (tournamentError || !tournament) {
    notFound();
  }

  // Fetch all matches for this tournament, grouped by round
  const { data: matches } = await supabase
    .from('matches')
    .select('id, round_number, game_type')
    .eq('tournament_id', id)
    .order('round_number', { ascending: true });

  if (!matches || matches.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950 p-4 pb-24">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-4xl font-bold text-slate-100">{tournament.name}</h1>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <p className="text-slate-400">No matches found for this tournament.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // Get the current round (highest round number)
  const currentRound = Math.max(...matches.map((m) => m.round_number || 1));
  const currentRoundMatches = matches.filter((m) => m.round_number === currentRound);

  // Fetch participants for current round matches
  const matchDetails = await Promise.all(
    currentRoundMatches.map(async (match) => {
      const { data: participants } = await supabase
        .from('match_participants')
        .select('id, player_id, result')
        .eq('match_id', match.id);

      if (!participants || participants.length === 0) {
        return { match, participants: [] };
      }

      // Fetch player details
      const playerIds = participants.map((p) => p.player_id);
      const { data: players } = await supabase
        .from('players')
        .select('id, name, nickname')
        .in('id', playerIds);

      const playersMap = new Map(players?.map((p) => [p.id, p]) || []);

      return {
        match,
        participants: participants.map((p) => ({
          ...p,
          player: playersMap.get(p.player_id),
        })),
      };
    })
  );

  const getMatchStatus = (participants: any[]) => {
    const winner = participants.find((p) => p.result === 'win');
    const hasResult = participants.some((p) => p.result !== null);

    if (!hasResult) {
      return 'Waiting for Result';
    }

    if (winner && winner.player) {
      return `${winner.player.nickname || winner.player.name} Won`;
    }

    // Check for bye (only one participant with win)
    if (participants.length === 1 && participants[0].result === 'win') {
      return `${participants[0].player?.nickname || participants[0].player?.name || 'Player'} (Bye)`;
    }

    return 'Match Completed';
  };

  return (
    <main className="min-h-screen bg-slate-950 p-4 pb-24">
      <RoundGeneratedToast />
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-100 mb-2">{tournament.name}</h1>
          <p className="text-slate-400">
            Round {currentRound} of {tournament.max_rounds || '?'} ({tournament.format})
          </p>
          {tournament.status === 'completed' && (
            <p className="text-yellow-500 font-semibold mt-2">Tournament Completed</p>
          )}
        </div>

        <div className="space-y-4">
          {matchDetails.map(({ match, participants }) => {
            const status = getMatchStatus(participants);
            const isCompleted = participants.some((p) => p.result !== null);

            // Handle bye (single participant)
            if (participants.length === 1) {
              const player = participants[0].player;
              return (
                <Card
                  key={match.id}
                  className="bg-slate-900 border-slate-800 border-yellow-500/20"
                >
                  <CardHeader>
                    <CardTitle className="text-slate-100">Bye</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg text-slate-100 mb-2">
                      {player?.nickname || player?.name || 'Unknown Player'}
                    </p>
                    <p className="text-sm text-slate-400">{status}</p>
                  </CardContent>
                </Card>
              );
            }

            // Normal match with two players
            const player1 = participants[0]?.player;
            const player2 = participants[1]?.player;

            return (
              <Card
                key={match.id}
                className={`bg-slate-900 border-slate-800 ${
                  isCompleted ? '' : 'border-yellow-500/20'
                }`}
              >
                <CardHeader>
                  <CardTitle className="text-slate-100">
                    {player1?.nickname || player1?.name || 'Player 1'} vs.{' '}
                    {player2?.nickname || player2?.name || 'Player 2'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-400">{status}</p>
                  {!isCompleted && (
                    <Button
                      asChild
                      className="w-full h-12 bg-yellow-500 hover:bg-yellow-600 text-slate-950"
                    >
                      <Link href={`/tournament/${id}/match/${match.id}`}>
                        Report Result
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}

