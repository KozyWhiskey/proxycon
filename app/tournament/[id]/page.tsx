import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import RoundGeneratedToast from '@/components/tournament/round-generated-toast';
import RoundTimer from '@/components/tournament/round-timer';
import PageHeader from '@/components/ui/page-header';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TournamentPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch tournament
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select('id, name, format, status, max_rounds, round_duration_minutes, prize_1st, prize_2nd, prize_3rd')
    .eq('id', id)
    .single();

  if (tournamentError || !tournament) {
    notFound();
  }

  // If tournament is pending, redirect to seating page
  if (tournament.status === 'pending') {
    redirect(`/tournament/${id}/seating`);
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

  // Fetch timer state for current round (use first match of round)
  const { data: timerMatch } = await supabase
    .from('matches')
    .select('started_at, paused_at, total_paused_seconds')
    .eq('tournament_id', id)
    .eq('round_number', currentRound)
    .limit(1)
    .maybeSingle();

  // Calculate standings with points and total games won
  const matchIds = matches.map((m) => m.id);
  const { data: allParticipants } = await supabase
    .from('match_participants')
    .select('player_id, result, games_won')
    .in('match_id', matchIds);

  // Get all tournament participants
  const { data: tournamentParticipants } = await supabase
    .from('tournament_participants')
    .select('player_id')
    .eq('tournament_id', id);

  const standingsMap = new Map<string, { wins: number; losses: number; draws: number; points: number; totalGamesWon: number }>();

  allParticipants?.forEach((p) => {
    if (!standingsMap.has(p.player_id)) {
      standingsMap.set(p.player_id, { wins: 0, losses: 0, draws: 0, points: 0, totalGamesWon: 0 });
    }

    const standing = standingsMap.get(p.player_id)!;
    standing.totalGamesWon += p.games_won || 0;
    
    if (p.result === 'win') {
      standing.wins++;
      standing.points += 3;
    } else if (p.result === 'loss') {
      standing.losses++;
      standing.points += 1;
    } else if (p.result === 'draw') {
      standing.draws++;
      standing.points += 2;
    }
  });

  // Ensure all tournament participants are in standings (even with 0 points)
  tournamentParticipants?.forEach((tp) => {
    if (!standingsMap.has(tp.player_id)) {
      standingsMap.set(tp.player_id, { wins: 0, losses: 0, draws: 0, points: 0, totalGamesWon: 0 });
    }
  });

  // Fetch player details for standings
  const playerIdsForStandings = Array.from(standingsMap.keys());
  const { data: standingsPlayers } = await supabase
    .from('players')
    .select('id, name, nickname')
    .in('id', playerIdsForStandings);

  const playersMap = new Map(standingsPlayers?.map((p) => [p.id, p]) || []);

  // Convert to array and sort by points (primary), total games won (secondary), wins (tertiary), losses (quaternary)
  const standings = Array.from(standingsMap.entries())
    .map(([id, stats]) => ({
      id,
      ...stats,
      player: playersMap.get(id),
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.totalGamesWon !== a.totalGamesWon) return b.totalGamesWon - a.totalGamesWon;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.losses - b.losses;
    });

  // Fetch participants for current round matches
  const matchDetails = await Promise.all(
    currentRoundMatches.map(async (match) => {
      const { data: participants } = await supabase
        .from('match_participants')
        .select('id, player_id, result, games_won')
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

  interface ParticipantWithPlayer {
    id: string;
    player_id: string;
    result: string | null;
    games_won: number | null;
    player?: {
      id: string;
      name: string;
      nickname: string | null;
    };
  }

  const getMatchStatus = (participants: ParticipantWithPlayer[]) => {
    const winner = participants.find((p) => p.result === 'win');
    const hasDraw = participants.every((p) => p.result === 'draw');
    const hasResult = participants.some((p) => p.result !== null);

    if (!hasResult) {
      return 'Waiting for Result';
    }

    // Show game score if available
    if (participants.length === 2) {
      const p1Games = participants[0].games_won || 0;
      const p2Games = participants[1].games_won || 0;
      const hasGameScore = p1Games > 0 || p2Games > 0;

      if (hasDraw && hasGameScore) {
        return `Draw (${p1Games}-${p2Games})`;
      }

      if (winner && winner.player && hasGameScore) {
        const winnerGames = winner.games_won || 0;
        const loser = participants.find((p) => p.result === 'loss');
        const loserGames = loser?.games_won || 0;
        return `${winner.player.nickname || winner.player.name} Won (${winnerGames}-${loserGames})`;
      }
    }

    if (hasDraw) {
      return 'Draw';
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

  const subtitle = `Round ${currentRound} of ${tournament.max_rounds || '?'} • ${tournament.format}${
    tournament.status === 'completed' ? ' • Completed' : ''
  }`;

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title={tournament.name}
        subtitle={subtitle}
        backHref="/"
        backLabel="Dashboard"
      />
      <RoundGeneratedToast />
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Round Timer */}
        {tournament.status === 'active' && (
          <RoundTimer
            tournamentId={id}
            roundNumber={currentRound}
            initialTimerData={{
              roundDurationMinutes: tournament.round_duration_minutes || 50,
              startedAt: timerMatch?.started_at || null,
              pausedAt: timerMatch?.paused_at || null,
              totalPausedSeconds: timerMatch?.total_paused_seconds || 0,
            }}
          />
        )}

        {/* Standings */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100">Standings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {standings.map((standing, index) => (
                <div
                  key={standing.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 font-bold w-6 text-center">
                      {index + 1}
                    </span>
                    <span className="text-slate-100 font-medium">
                      {standing.player?.nickname || standing.player?.name || 'Unknown Player'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="text-center min-w-[36px]">
                      <div className="text-yellow-500 font-bold">{standing.points}</div>
                      <div className="text-slate-400 text-xs">pts</div>
                    </div>
                    <div className="text-center min-w-[32px]">
                      <div className="text-purple-400 font-bold">{standing.totalGamesWon}</div>
                      <div className="text-slate-400 text-xs">GW</div>
                    </div>
                    <div className="text-center min-w-[24px]">
                      <div className="text-green-500">{standing.wins}</div>
                      <div className="text-slate-400 text-xs">W</div>
                    </div>
                    <div className="text-center min-w-[24px]">
                      <div className="text-blue-500">{standing.draws}</div>
                      <div className="text-slate-400 text-xs">D</div>
                    </div>
                    <div className="text-center min-w-[24px]">
                      <div className="text-red-500">{standing.losses}</div>
                      <div className="text-slate-400 text-xs">L</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tournament Prizes - Show when tournament is completed and has prizes */}
        {tournament.status === 'completed' && (tournament.prize_1st || tournament.prize_2nd || tournament.prize_3rd) && (
          <Card className="bg-slate-900 border-yellow-500/30">
            <CardHeader>
              <CardTitle className="text-yellow-500 flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                Tournament Prizes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tournament.prize_1st && standings[0] && (
                <div className="flex items-center gap-3 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <span className="text-3xl">🥇</span>
                  <div className="flex-1">
                    <p className="text-slate-100 font-semibold text-lg">
                      {standings[0].player?.nickname || standings[0].player?.name || 'Unknown'}
                    </p>
                    <p className="text-yellow-500 font-medium">{tournament.prize_1st}</p>
                  </div>
                </div>
              )}
              {tournament.prize_2nd && standings[1] && (
                <div className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                  <span className="text-3xl">🥈</span>
                  <div className="flex-1">
                    <p className="text-slate-100 font-semibold text-lg">
                      {standings[1].player?.nickname || standings[1].player?.name || 'Unknown'}
                    </p>
                    <p className="text-slate-300">{tournament.prize_2nd}</p>
                  </div>
                </div>
              )}
              {tournament.prize_3rd && standings[2] && (
                <div className="flex items-center gap-3 p-4 bg-amber-900/20 rounded-lg border border-amber-700/30">
                  <span className="text-3xl">🥉</span>
                  <div className="flex-1">
                    <p className="text-slate-100 font-semibold text-lg">
                      {standings[2].player?.nickname || standings[2].player?.name || 'Unknown'}
                    </p>
                    <p className="text-amber-500">{tournament.prize_3rd}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
                  className="bg-slate-900 border-yellow-500/20"
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

