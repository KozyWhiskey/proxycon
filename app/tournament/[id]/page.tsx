import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import RoundGeneratedToast from '@/components/tournament/round-generated-toast';
import RoundTimer from '@/components/tournament/round-timer';
import PageHeader from '@/components/ui/page-header';
import { Monitor } from 'lucide-react';
import {
  calculateStandings,
  sortStandings,
  convertDbMatchToMatchResult,
  formatOMWPercentage,
  type MatchResult,
} from '@/lib/swiss-pairing';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TournamentPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch tournament
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select('id, event_id, name, format, status, max_rounds, round_duration_minutes, prize_1st, prize_2nd, prize_3rd')
    .eq('id', id)
    .single();

  if (tournamentError || !tournament) {
    notFound();
  }

  // If tournament is pending, redirect to seating page
  if (tournament.status === 'pending') {
    redirect(`/tournament/${id}/seating`);
  }

  const backHref = tournament.event_id ? `/events/${tournament.event_id}` : '/';
  const backLabel = tournament.event_id ? 'Event Dashboard' : 'Home';

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
    .select('started_at, paused_at, remaining_seconds')
    .eq('tournament_id', id)
    .eq('round_number', currentRound)
    .limit(1)
    .maybeSingle();

  // Get all tournament participants
  const { data: tournamentParticipants } = await supabase
    .from('tournament_participants')
    .select('player_id')
    .eq('tournament_id', id);

  const playerIds = tournamentParticipants?.map((tp) => tp.player_id) || [];

  // Fetch all match participants for standings calculation
  const matchIds = matches.map((m) => m.id);
  const { data: allParticipants } = await supabase
    .from('match_participants')
    .select('match_id, player_id, result, games_won')
    .in('match_id', matchIds);

  // Build match history for Swiss standings calculation
  const participantsByMatch = new Map<string, { playerId: string; result: 'win' | 'loss' | 'draw' | null; gamesWon: number }[]>();
  allParticipants?.forEach((p) => {
    if (!participantsByMatch.has(p.match_id)) {
      participantsByMatch.set(p.match_id, []);
    }
    participantsByMatch.get(p.match_id)!.push({
      playerId: p.player_id,
      result: p.result as 'win' | 'loss' | 'draw' | null,
      gamesWon: p.games_won || 0,
    });
  });

  // Convert to MatchResult format for Swiss standings
  const matchHistory: MatchResult[] = [];
  for (const match of matches) {
    const participants = participantsByMatch.get(match.id) || [];
    if (participants.length > 0) {
      matchHistory.push(
        convertDbMatchToMatchResult(
          match.id,
          match.round_number || 1,
          participants.map((p) => ({ playerId: p.playerId, result: p.result }))
        )
      );
    }
  }

  // Calculate standings using MTG Swiss rules (3-1-0 point system, OMW% tiebreaker)
  const standingsMap = calculateStandings(playerIds, matchHistory);
  
  // Also track games won from the database for display
  const gamesWonMap = new Map<string, number>();
  allParticipants?.forEach((p) => {
    const current = gamesWonMap.get(p.player_id) || 0;
    gamesWonMap.set(p.player_id, current + (p.games_won || 0));
  });

  // Fetch player details for standings
  const { data: standingsPlayers } = await supabase
    .from('players')
    .select('id, name, nickname')
    .in('id', playerIds);

  const playersMap = new Map(standingsPlayers?.map((p) => [p.id, p]) || []);

  // Convert to sorted array using MTG tiebreakers (Points > OMW% > GW%)
  const sortedStandings = sortStandings(Array.from(standingsMap.values()));
  
  const standings = sortedStandings.map((standing) => ({
    id: standing.playerId,
    wins: standing.matchWins,
    losses: standing.matchLosses,
    draws: standing.matchDraws,
    points: standing.points,
    totalGamesWon: gamesWonMap.get(standing.playerId) || 0,
    omwPercentage: standing.opponentMatchWinPercentage,
    mwPercentage: standing.matchWinPercentage,
    gwPercentage: standing.gameWinPercentage,
    receivedBye: standing.receivedBye,
    player: playersMap.get(standing.playerId),
  }));

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
        backHref={backHref}
        backLabel={backLabel}
      />
      <RoundGeneratedToast />
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Dashboard Link */}
        <Button
          asChild
          variant="outline"
          className="w-full h-12 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
        >
          <Link href={`/tournament/${id}/dashboard`}>
            <Monitor className="w-5 h-5 mr-2" />
            Open Shared Screen Dashboard
          </Link>
        </Button>

        {/* Round Timer */}
        {tournament.status === 'active' && (
          <RoundTimer
            tournamentId={id}
            roundNumber={currentRound}
            initialTimerData={{
              roundDurationMinutes: tournament.round_duration_minutes || 50,
              startedAt: timerMatch?.started_at || null,
              pausedAt: timerMatch?.paused_at || null,
              remainingSeconds: timerMatch?.remaining_seconds ?? null,
            }}
          />
        )}

        {/* Standings */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-100">Standings</CardTitle>
              <span className="text-xs text-slate-500">MTG Swiss (3-1-0)</span>
            </div>
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
                    <div className="flex flex-col">
                      <span className="text-slate-100 font-medium">
                        {standing.player?.nickname || standing.player?.name || 'Unknown Player'}
                      </span>
                      {standing.receivedBye && (
                        <span className="text-xs text-yellow-600">Has bye</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="text-center min-w-[36px]">
                      <div className="text-yellow-500 font-bold">{standing.points}</div>
                      <div className="text-slate-400 text-xs">pts</div>
                    </div>
                    <div className="text-center min-w-[44px]">
                      <div className="text-cyan-400 font-medium text-xs">
                        {formatOMWPercentage(standing.omwPercentage)}
                      </div>
                      <div className="text-slate-400 text-xs">OMW%</div>
                    </div>
                    <div className="text-center min-w-[60px]">
                      <div className="text-slate-300 font-medium">
                        {standing.wins}-{standing.losses}-{standing.draws}
                      </div>
                      <div className="text-slate-400 text-xs">W-L-D</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Point system legend */}
            <div className="mt-4 pt-3 border-t border-slate-700">
              <p className="text-xs text-slate-500 text-center">
                Win = 3pts • Draw = 1pt • Loss = 0pts • OMW% = Opponent Match Win %
              </p>
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

