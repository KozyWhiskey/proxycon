import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/ui/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  calculateStandings,
  sortStandings,
  convertDbMatchToMatchResult,
} from '@/lib/swiss-pairing';
import { Trophy, Medal, Award, TrendingUp, Activity } from 'lucide-react';
import Link from 'next/link';

interface PlayerStats {
  playerId: string;
  playerName: string;
  playerNickname: string | null;
  tournamentWins: number;
  matchWins: number;
  matchLosses: number;
  matchDraws: number;
  totalMatches: number;
  winPercentage: number;
  currentWinStreak: number;
  longestWinStreak: number;
}

interface TournamentWinner {
  tournamentId: string;
  tournamentName: string;
  winnerId: string;
  winnerName: string;
  winnerNickname: string | null;
}

export default async function WeekendSummaryPage() {
  const supabase = await createClient();

  // Fetch all completed tournaments
  const { data: completedTournaments } = await supabase
    .from('tournaments')
    .select('id, name, format, created_at')
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  // Fetch all casual matches (tournament_id is null)
  const { data: casualMatches } = await supabase
    .from('matches')
    .select('id')
    .is('tournament_id', null);

  // Fetch all tournament matches
  const { data: tournamentMatches } = await supabase
    .from('matches')
    .select('id, tournament_id, round_number')
    .not('tournament_id', 'is', null);

  // Get all match participants for all matches
  const allMatchIds = [
    ...(casualMatches?.map((m) => m.id) || []),
    ...(tournamentMatches?.map((m) => m.id) || []),
  ];

  let allMatchParticipants = null;
  if (allMatchIds.length > 0) {
    const { data } = await supabase
      .from('match_participants')
      .select('match_id, player_id, result')
      .in('match_id', allMatchIds);
    allMatchParticipants = data;
  }

  // Get all players
  const { data: allPlayers } = await supabase
    .from('players')
    .select('id, name, nickname')
    .order('name', { ascending: true });

  if (!allPlayers || allPlayers.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950 pb-24">
        <PageHeader title="Weekend Summary" subtitle="Tournament and match statistics" backHref="/" backLabel="Dashboard" />
        <div className="max-w-4xl mx-auto p-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <p className="text-slate-400">No players found.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const playersMap = new Map(allPlayers.map((p) => [p.id, p]));

  // Calculate tournament winners
  const tournamentWinners: TournamentWinner[] = [];
  for (const tournament of completedTournaments || []) {
    // Get tournament participants
    const { data: tournamentParticipants } = await supabase
      .from('tournament_participants')
      .select('player_id')
      .eq('tournament_id', tournament.id);

    if (!tournamentParticipants || tournamentParticipants.length === 0) continue;

    const playerIds = tournamentParticipants.map((tp) => tp.player_id);

    // Get all matches for this tournament
    const { data: tournamentMatchesData } = await supabase
      .from('matches')
      .select('id, round_number')
      .eq('tournament_id', tournament.id)
      .order('round_number', { ascending: true });

    if (!tournamentMatchesData || tournamentMatchesData.length === 0) continue;

    // Build match history
    const matchHistory = [];
    for (const match of tournamentMatchesData) {
      const participants = allMatchParticipants?.filter((p) => p.match_id === match.id) || [];
      if (participants.length > 0) {
        matchHistory.push(
          convertDbMatchToMatchResult(
            match.id,
            match.round_number || 1,
            participants.map((p) => ({ playerId: p.player_id, result: p.result as 'win' | 'loss' | 'draw' | null }))
          )
        );
      }
    }

    // Calculate standings
    const standingsMap = calculateStandings(playerIds, matchHistory);
    const sortedStandings = sortStandings(Array.from(standingsMap.values()));

    if (sortedStandings.length > 0) {
      const winner = sortedStandings[0];
      const winnerPlayer = playersMap.get(winner.playerId);
      if (winnerPlayer) {
        tournamentWinners.push({
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          winnerId: winner.playerId,
          winnerName: winnerPlayer.name,
          winnerNickname: winnerPlayer.nickname,
        });
      }
    }
  }

  // Calculate player statistics
  const playerStatsMap = new Map<string, PlayerStats>();

  // Initialize all players
  for (const player of allPlayers) {
    playerStatsMap.set(player.id, {
      playerId: player.id,
      playerName: player.name,
      playerNickname: player.nickname,
      tournamentWins: 0,
      matchWins: 0,
      matchLosses: 0,
      matchDraws: 0,
      totalMatches: 0,
      winPercentage: 0,
      currentWinStreak: 0,
      longestWinStreak: 0,
    });
  }

  // Count tournament wins
  for (const winner of tournamentWinners) {
    const stats = playerStatsMap.get(winner.winnerId);
    if (stats) {
      stats.tournamentWins++;
    }
  }

  // Process all matches chronologically to calculate streaks
  const allMatchesWithParticipants = [];
  if (allMatchIds.length > 0 && allMatchParticipants) {
    for (const matchId of allMatchIds) {
      const participants = allMatchParticipants.filter((p) => p.match_id === matchId);
      if (participants.length > 0) {
        const match = tournamentMatches?.find((m) => m.id === matchId) || casualMatches?.find((m) => m.id === matchId);
        allMatchesWithParticipants.push({
          matchId,
          tournamentId: match && 'tournament_id' in match ? match.tournament_id : null,
          createdAt: null, // We'll fetch this if needed
          participants,
        });
      }
    }
  }

  // Fetch match creation times for chronological ordering
  let matchesWithTime = null;
  const matchTimeMap = new Map<string, string>();
  if (allMatchIds.length > 0) {
    const { data } = await supabase
      .from('matches')
      .select('id, created_at')
      .in('id', allMatchIds);
    matchesWithTime = data;
    if (matchesWithTime) {
      matchesWithTime.forEach((m) => {
        if (m.created_at) {
          matchTimeMap.set(m.id, m.created_at);
        }
      });
    }
  }

  // Sort matches by creation time
  if (matchesWithTime) {
    allMatchesWithParticipants.sort((a, b) => {
      const timeA = matchTimeMap.get(a.matchId) || '';
      const timeB = matchTimeMap.get(b.matchId) || '';
      return timeA.localeCompare(timeB);
    });
  }

  // Track current streaks per player
  const currentStreaks = new Map<string, number>();
  const longestStreaks = new Map<string, number>();

  // Process matches chronologically
  for (const { participants } of allMatchesWithParticipants) {
    // Only process completed matches
    const hasResults = participants.some((p) => p.result !== null);
    if (!hasResults) continue;

    for (const participant of participants) {
      const stats = playerStatsMap.get(participant.player_id);
      if (!stats) continue;

      stats.totalMatches++;

      if (participant.result === 'win') {
        stats.matchWins++;
        const currentStreak = (currentStreaks.get(participant.player_id) || 0) + 1;
        currentStreaks.set(participant.player_id, currentStreak);
        const longestStreak = longestStreaks.get(participant.player_id) || 0;
        if (currentStreak > longestStreak) {
          longestStreaks.set(participant.player_id, currentStreak);
        }
      } else if (participant.result === 'loss') {
        stats.matchLosses++;
        currentStreaks.set(participant.player_id, 0);
      } else if (participant.result === 'draw') {
        stats.matchDraws++;
        // Draws break win streaks but don't count as losses for streak purposes
        currentStreaks.set(participant.player_id, 0);
      }
    }
  }

  // Update final stats
  for (const stats of playerStatsMap.values()) {
    stats.currentWinStreak = currentStreaks.get(stats.playerId) || 0;
    stats.longestWinStreak = longestStreaks.get(stats.playerId) || 0;
    if (stats.totalMatches > 0) {
      stats.winPercentage = (stats.matchWins / stats.totalMatches) * 100;
    }
  }

  const playerStats = Array.from(playerStatsMap.values());

  // Create leaderboards
  const leaderboardTournamentWins = [...playerStats]
    .filter((p) => p.tournamentWins > 0)
    .sort((a, b) => b.tournamentWins - a.tournamentWins);

  const leaderboardMatchWins = [...playerStats]
    .filter((p) => p.matchWins > 0)
    .sort((a, b) => b.matchWins - a.matchWins);

  const leaderboardWinPercentage = [...playerStats]
    .filter((p) => p.totalMatches >= 3) // Minimum 3 matches
    .sort((a, b) => b.winPercentage - a.winPercentage);

  const leaderboardWinStreak = [...playerStats]
    .filter((p) => p.longestWinStreak > 0)
    .sort((a, b) => b.longestWinStreak - a.longestWinStreak);

  const leaderboardMostActive = [...playerStats]
    .filter((p) => p.totalMatches > 0)
    .sort((a, b) => b.totalMatches - a.totalMatches);

  const totalTournaments = completedTournaments?.length || 0;
  const totalCasualGames = casualMatches?.length || 0;

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title="Weekend Summary"
        subtitle="Tournament and match statistics"
        backHref="/"
        backLabel="Dashboard"
      />
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Tournament Overview */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Tournament Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="text-3xl font-bold text-yellow-500">{totalTournaments}</div>
                <div className="text-sm text-slate-400">Tournaments Completed</div>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="text-3xl font-bold text-cyan-500">{totalCasualGames}</div>
                <div className="text-sm text-slate-400">Casual Games Played</div>
              </div>
            </div>

            {tournamentWinners.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-3">Tournament Winners</h3>
                <div className="space-y-2">
                  {tournamentWinners.map((winner) => (
                    <div
                      key={winner.tournamentId}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Medal className="w-5 h-5 text-yellow-500" />
                        <div>
                          <Link
                            href={`/tournament/${winner.tournamentId}`}
                            className="text-slate-100 font-medium hover:text-yellow-500 transition-colors"
                          >
                            {winner.tournamentName}
                          </Link>
                          <div className="text-sm text-slate-400">
                            Winner: {winner.winnerNickname || winner.winnerName}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Player Statistics */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-500" />
              Player Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-slate-300">Player</TableHead>
                    <TableHead className="text-slate-300 text-center">Tournament Wins</TableHead>
                    <TableHead className="text-slate-300 text-center">Match Wins</TableHead>
                    <TableHead className="text-slate-300 text-center">Match Losses</TableHead>
                    <TableHead className="text-slate-300 text-center">Win %</TableHead>
                    <TableHead className="text-slate-300 text-center">Current Streak</TableHead>
                    <TableHead className="text-slate-300 text-center">Longest Streak</TableHead>
                    <TableHead className="text-slate-300 text-center">Total Matches</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playerStats
                    .filter((p) => p.totalMatches > 0)
                    .map((stat) => (
                      <TableRow key={stat.playerId}>
                        <TableCell className="font-medium text-slate-100">
                          {stat.playerNickname || stat.playerName}
                        </TableCell>
                        <TableCell className="text-center text-yellow-500 font-semibold">
                          {stat.tournamentWins}
                        </TableCell>
                        <TableCell className="text-center text-green-500">{stat.matchWins}</TableCell>
                        <TableCell className="text-center text-red-500">{stat.matchLosses}</TableCell>
                        <TableCell className="text-center text-slate-300">
                          {stat.winPercentage.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center text-cyan-500 font-semibold">
                          {stat.currentWinStreak}
                        </TableCell>
                        <TableCell className="text-center text-purple-500 font-semibold">
                          {stat.longestWinStreak}
                        </TableCell>
                        <TableCell className="text-center text-slate-400">{stat.totalMatches}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Most Tournament Wins */}
          {leaderboardTournamentWins.length > 0 && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Most Tournament Wins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboardTournamentWins.slice(0, 10).map((stat, index) => (
                    <div
                      key={stat.playerId}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-bold w-6 text-center">
                          {index + 1}
                        </span>
                        <span className="text-slate-100 font-medium">
                          {stat.playerNickname || stat.playerName}
                        </span>
                      </div>
                      <span className="text-yellow-500 font-bold">{stat.tournamentWins}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Most Match Wins */}
          {leaderboardMatchWins.length > 0 && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-500" />
                  Most Match Wins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboardMatchWins.slice(0, 10).map((stat, index) => (
                    <div
                      key={stat.playerId}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-bold w-6 text-center">
                          {index + 1}
                        </span>
                        <span className="text-slate-100 font-medium">
                          {stat.playerNickname || stat.playerName}
                        </span>
                      </div>
                      <span className="text-green-500 font-bold">{stat.matchWins}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Highest Win Percentage */}
          {leaderboardWinPercentage.length > 0 && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-500" />
                  Highest Win Percentage
                  <span className="text-xs text-slate-500 font-normal">(min. 3 matches)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboardWinPercentage.slice(0, 10).map((stat, index) => (
                    <div
                      key={stat.playerId}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-bold w-6 text-center">
                          {index + 1}
                        </span>
                        <div>
                          <span className="text-slate-100 font-medium">
                            {stat.playerNickname || stat.playerName}
                          </span>
                          <div className="text-xs text-slate-500">
                            {stat.matchWins}-{stat.matchLosses}-{stat.matchDraws} ({stat.totalMatches} matches)
                          </div>
                        </div>
                      </div>
                      <span className="text-cyan-500 font-bold">{stat.winPercentage.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Longest Win Streak */}
          {leaderboardWinStreak.length > 0 && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  Longest Win Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboardWinStreak.slice(0, 10).map((stat, index) => (
                    <div
                      key={stat.playerId}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-bold w-6 text-center">
                          {index + 1}
                        </span>
                        <span className="text-slate-100 font-medium">
                          {stat.playerNickname || stat.playerName}
                        </span>
                      </div>
                      <span className="text-purple-500 font-bold">{stat.longestWinStreak}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Most Active Player */}
          {leaderboardMostActive.length > 0 && (
            <Card className="bg-slate-900 border-slate-800 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-slate-400" />
                  Most Active Players
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {leaderboardMostActive.slice(0, 10).map((stat, index) => (
                    <div
                      key={stat.playerId}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-bold w-6 text-center">
                          {index + 1}
                        </span>
                        <span className="text-slate-100 font-medium">
                          {stat.playerNickname || stat.playerName}
                        </span>
                      </div>
                      <span className="text-slate-400 font-bold">{stat.totalMatches} matches</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
