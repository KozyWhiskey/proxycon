import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import RoundGeneratedToast from '@/components/tournament/round-generated-toast';
import RoundTimer from '@/components/tournament/round-timer';
import PageHeader from '@/components/ui/page-header';
import { Monitor, Trophy, Users, Crown } from 'lucide-react';
import {
  calculateStandings,
  sortStandings,
  convertDbMatchToMatchResult,
  formatOMWPercentage,
  type MatchResult,
} from '@/lib/swiss-pairing';

import ForceStartButton from '@/components/tournament/force-start-button';
import { cn } from '@/lib/utils';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TournamentPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch tournament
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select('id, event_id, name, format, status, max_rounds, round_duration_minutes')
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
      <main className="min-h-screen bg-background p-4 pb-24">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-4xl font-bold font-heading text-foreground">{tournament.name}</h1>
          <Card className="glass-panel">
            <CardContent className="pt-6">
              <p className="text-muted-foreground">No matches found for this tournament.</p>
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
    .select('profile_id')
    .eq('tournament_id', id);

  const profileIds = tournamentParticipants?.map((tp) => tp.profile_id) || [];

  // Fetch all match participants for standings calculation
  const matchIds = matches.map((m) => m.id);
  const { data: allParticipants } = await supabase
    .from('match_participants')
    .select('match_id, profile_id, result, games_won')
    .in('match_id', matchIds);

  // Build match history for Swiss standings calculation
  const participantsByMatch = new Map<string, { profileId: string; result: 'win' | 'loss' | 'draw' | null; gamesWon: number }[]>();
  allParticipants?.forEach((p) => {
    if (!participantsByMatch.has(p.match_id)) {
      participantsByMatch.set(p.match_id, []);
    }
    participantsByMatch.get(p.match_id)!.push({
      profileId: p.profile_id,
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
          participants.map((p) => ({ playerId: p.profileId, result: p.result }))
        )
      );
    }
  }

  // Calculate standings using MTG Swiss rules (3-1-0 point system, OMW% tiebreaker)
  const standingsMap = calculateStandings(profileIds, matchHistory);
  
  // Also track games won from the database for display
  const gamesWonMap = new Map<string, number>();
  allParticipants?.forEach((p) => {
    const current = gamesWonMap.get(p.profile_id) || 0;
    gamesWonMap.set(p.profile_id, current + (p.games_won || 0));
  });

  // Fetch profile details for standings
  const { data: standingsProfiles } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .in('id', profileIds);

  const profilesMap = new Map(standingsProfiles?.map((p) => [p.id, p]) || []);

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
    profile: profilesMap.get(standing.playerId),
  }));

  // Fetch participants for current round matches
  const matchDetails = await Promise.all(
    currentRoundMatches.map(async (match) => {
      const { data: participants } = await supabase
        .from('match_participants')
        .select('id, profile_id, result, games_won')
        .eq('match_id', match.id);

      if (!participants || participants.length === 0) {
        return { match, participants: [] };
      }

      // Fetch profile details
      const profileIds = participants.map((p) => p.profile_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', profileIds);

      const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return {
        match,
        participants: participants.map((p) => ({
          ...p,
          profile: profilesMap.get(p.profile_id),
        })),
      };
    })
  );

  interface ParticipantWithProfile {
    id: string;
    profile_id: string;
    result: string | null;
    games_won: number | null;
    profile?: {
      id: string;
      username: string;
      display_name: string | null;
    };
  }

  const getMatchStatus = (participants: ParticipantWithProfile[]) => {
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

      if (winner && winner.profile && hasGameScore) {
        const winnerGames = winner.games_won || 0;
        const loser = participants.find((p) => p.result === 'loss');
        const loserGames = loser?.games_won || 0;
        return `${winner.profile.display_name || winner.profile.username} Won (${winnerGames}-${loserGames})`;
      }
    }

    if (hasDraw) {
      return 'Draw';
    }

    if (winner && winner.profile) {
      return `${winner.profile.display_name || winner.profile.username} Won`;
    }

    // Check for bye (only one participant with win)
    if (participants.length === 1 && participants[0].result === 'win') {
      return `${participants[0].profile?.display_name || participants[0].profile?.username || 'Player'} (Bye)`;
    }

    return 'Match Completed';
  };

  const subtitle = `Round ${currentRound} of ${tournament.max_rounds || '?'} • ${tournament.format}${
    tournament.status === 'completed' ? ' • Completed' : ''
  }`;

  return (
    <main className="min-h-screen bg-background pb-24">
      <PageHeader
        title={tournament.name}
        subtitle={subtitle}
        backHref={backHref}
        backLabel={backLabel}
      />
      <RoundGeneratedToast />
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Dashboard Link */}
        <Button
          asChild
          variant="outline"
          className="w-full h-12 border-primary/20 text-primary hover:bg-primary/10 hover:text-primary transition-all group"
        >
          <Link href={`/tournament/${id}/dashboard`}>
            <Monitor className="w-5 h-5 mr-2 group-hover:text-glow" />
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
        <Card className="glass-panel">
          <CardHeader className="border-b border-white/5 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground font-heading flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Standings
              </CardTitle>
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">MTG Swiss (3-1-0)</span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {standings.map((standing, index) => (
                <div
                  key={standing.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 border border-white/5 hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 text-center font-bold text-lg text-muted-foreground/50">
                      {index + 1}
                    </div>
                    <div className="flex flex-col">
                      <span className={cn(
                        "font-medium text-lg font-heading",
                        index === 0 ? "text-primary text-glow" : "text-foreground"
                      )}>
                        {standing.profile?.display_name || standing.profile?.username || 'Unknown Player'}
                      </span>
                      {standing.receivedBye && (
                        <span className="text-xs text-primary/70">Received Bye</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center min-w-[40px]">
                      <div className="text-primary font-bold text-xl">{standing.points}</div>
                      <div className="text-muted-foreground text-[10px] uppercase tracking-wider">pts</div>
                    </div>
                    <div className="text-center min-w-[50px] hidden sm:block">
                      <div className="text-cyan-500 font-medium font-mono">
                        {formatOMWPercentage(standing.omwPercentage)}
                      </div>
                      <div className="text-muted-foreground text-[10px] uppercase tracking-wider">OMW%</div>
                    </div>
                    <div className="text-center min-w-[60px]">
                      <div className="text-foreground font-medium font-mono tracking-wider">
                        {standing.wins}-{standing.losses}-{standing.draws}
                      </div>
                      <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Record</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Point system legend */}
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-xs text-muted-foreground text-center uppercase tracking-widest">
                Win = 3 • Draw = 1 • Loss = 0
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tournament Prizes */}
        {tournament.status === 'completed' && ((tournament as any).prize_1st || (tournament as any).prize_2nd || (tournament as any).prize_3rd) && (
          <Card className="glass-panel border-primary/20">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-primary flex items-center gap-2 font-heading">
                <Crown className="w-5 h-5" />
                Tournament Prizes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {(tournament as any).prize_1st && standings[0] && (
                <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <span className="text-3xl">🥇</span>
                  <div className="flex-1">
                    <p className="text-foreground font-bold font-heading text-lg">
                      {standings[0].profile?.display_name || standings[0].profile?.username || 'Unknown'}
                    </p>
                    <p className="text-primary font-medium">{(tournament as any).prize_1st}</p>
                  </div>
                </div>
              )}
              {(tournament as any).prize_2nd && standings[1] && (
                <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg border border-white/10">
                  <span className="text-3xl">🥈</span>
                  <div className="flex-1">
                    <p className="text-foreground font-semibold text-lg">
                      {standings[1].profile?.display_name || standings[1].profile?.username || 'Unknown'}
                    </p>
                    <p className="text-muted-foreground">{(tournament as any).prize_2nd}</p>
                  </div>
                </div>
              )}
              {(tournament as any).prize_3rd && standings[2] && (
                <div className="flex items-center gap-4 p-4 bg-amber-900/10 rounded-lg border border-amber-900/20">
                  <span className="text-3xl">🥉</span>
                  <div className="flex-1">
                    <p className="text-foreground font-semibold text-lg">
                      {standings[2].profile?.display_name || standings[2].profile?.username || 'Unknown'}
                    </p>
                    <p className="text-amber-700">{(tournament as any).prize_3rd}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-bold font-heading text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Current Matches
          </h2>
          
          {matchDetails.length > 0 ? (
            matchDetails.map(({ match, participants }) => {
              const status = getMatchStatus(participants);
              const isCompleted = participants.some((p) => p.result !== null);

              // Handle bye (single participant)
              if (participants.length === 1) {
                const profile = participants[0].profile;
                return (
                  <Card
                    key={match.id}
                    className="glass-panel border-primary/20"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-primary font-heading">Bye</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg text-foreground mb-1 font-medium">
                        {profile?.display_name || profile?.username || 'Unknown Player'}
                      </p>
                      <p className="text-sm text-muted-foreground italic">Automatic Win (2-0)</p>
                    </CardContent>
                  </Card>
                );
              }

              // Normal match with two players
              const player1 = participants[0]?.profile;
              const player2 = participants[1]?.profile;

              return (
                <Card
                  key={match.id}
                  className={cn(
                    "glass-panel transition-colors",
                    !isCompleted && "border-primary/20 bg-primary/5"
                  )}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-foreground font-heading flex justify-between items-center">
                      <span className={cn(participants[0].result === 'win' && "text-emerald-500 text-glow")}>
                        {player1?.display_name || player1?.username || 'Player 1'}
                      </span>
                      <span className="text-muted-foreground/50 text-sm font-sans font-normal">vs</span>
                      <span className={cn(participants[1].result === 'win' && "text-emerald-500 text-glow")}>
                        {player2?.display_name || player2?.username || 'Player 2'}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center uppercase tracking-widest">{status}</p>
                    {!isCompleted && (
                      <Button
                        asChild
                        className="w-full h-12 text-lg font-medium"
                        variant="default" // Primary/Gold
                      >
                        <Link href={`/tournament/${id}/match/${match.id}`}>
                          Report Result
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="glass-panel border-dashed">
              <CardContent className="pt-6 flex flex-col items-center py-12">
                <p className="text-muted-foreground text-center text-lg">No pairings found for Round {currentRound}.</p>
                {tournament.status === 'active' && (
                   <>
                     <p className="text-xs text-muted-foreground/60 text-center mt-2 max-w-md">
                       The pairings for this round may still be generating. If this persists, the tournament state may need a nudge.
                     </p>
                     <div className="mt-6">
                        <ForceStartButton tournamentId={id} />
                     </div>
                   </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}