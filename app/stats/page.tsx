import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/ui/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trophy, Medal, Award, TrendingUp, Activity, Users } from 'lucide-react';
import Link from 'next/link';
import { getGlobalStats } from '@/lib/stats';

export default async function StatsPage() {
  const supabase = await createClient();

  const {
    playerStats,
    tournamentWinners,
    totalTournaments,
    totalCasualGames,
  } = await getGlobalStats(supabase);

  if (playerStats.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950 pb-24">
        <PageHeader title="Stats" subtitle="Global player statistics" backHref="/" backLabel="Home" />
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


  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title="Stats"
        subtitle="Global player statistics and leaderboards"
        backHref="/"
        backLabel="Home"
        actions={
          <Button asChild variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <Link href="/players">
              <Users className="w-4 h-4 mr-2" />
              Directory
            </Link>
          </Button>
        }
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
                    <TableHead className="text-slate-300 text-center">Tourney Wins</TableHead>
                    <TableHead className="text-slate-300 text-center">Match Wins</TableHead>
                    <TableHead className="text-slate-300 text-center">Losses</TableHead>
                    <TableHead className="text-slate-300 text-center">Win %</TableHead>
                    <TableHead className="text-slate-300 text-center">Streak</TableHead>
                    <TableHead className="text-slate-300 text-center">Total</TableHead>
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
        </div>
      </div>
    </main>
  );
}
