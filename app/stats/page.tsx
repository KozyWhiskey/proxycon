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
      <main className="min-h-screen bg-background pb-24">
        <PageHeader title="Stats" subtitle="Global player statistics" backHref="/" backLabel="Home" />
        <div className="max-w-4xl mx-auto p-4">
          <Card className="glass-panel">
            <CardContent className="pt-6">
              <p className="text-muted-foreground">No players found.</p>
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
    <main className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Stats"
        subtitle="Global player statistics and leaderboards"
        backHref="/"
        backLabel="Home"
        actions={
          <Button asChild variant="outline" size="sm" className="bg-white/5 border-white/10 hover:bg-white/10">
            <Link href="/players">
              <Users className="w-4 h-4 mr-2" />
              Directory
            </Link>
          </Button>
        }
      />
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Tournament Overview */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Tournament Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                <div className="text-3xl font-bold text-primary">{totalTournaments}</div>
                <div className="text-sm text-muted-foreground">Tournaments Completed</div>
              </div>
              <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                <div className="text-3xl font-bold text-primary">{totalCasualGames}</div>
                <div className="text-sm text-muted-foreground">Casual Games Played</div>
              </div>
            </div>

            {tournamentWinners.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Tournament Winners</h3>
                <div className="space-y-2">
                  {tournamentWinners.map((winner) => (
                    <div
                      key={winner.tournamentId}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <Medal className="w-5 h-5 text-primary" />
                        <div>
                          <Link
                            href={`/tournament/${winner.tournamentId}`}
                            className="text-foreground font-medium hover:text-primary transition-colors"
                          >
                            {winner.tournamentName}
                          </Link>
                          <div className="text-sm text-muted-foreground">
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
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Player Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Player</TableHead>
                    <TableHead className="text-muted-foreground text-center">Tourney Wins</TableHead>
                    <TableHead className="text-muted-foreground text-center">Match Wins</TableHead>
                    <TableHead className="text-muted-foreground text-center">Losses</TableHead>
                    <TableHead className="text-muted-foreground text-center">Win %</TableHead>
                    <TableHead className="text-muted-foreground text-center">Streak</TableHead>
                    <TableHead className="text-muted-foreground text-center">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playerStats
                    .filter((p) => p.totalMatches > 0)
                    .map((stat) => (
                      <TableRow key={stat.playerId} className="border-white/5 hover:bg-white/5">
                        <TableCell className="font-medium text-foreground">
                          {stat.playerNickname || stat.playerName}
                        </TableCell>
                        <TableCell className="text-center text-primary font-semibold">
                          {stat.tournamentWins}
                        </TableCell>
                        <TableCell className="text-center text-emerald-500">{stat.matchWins}</TableCell>
                        <TableCell className="text-center text-rose-500">{stat.matchLosses}</TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {stat.winPercentage.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center text-primary font-semibold">
                          {stat.currentWinStreak}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground/60">{stat.totalMatches}</TableCell>
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
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Most Tournament Wins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboardTournamentWins.slice(0, 10).map((stat, index) => (
                    <div
                      key={stat.playerId}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground font-bold w-6 text-center">
                          {index + 1}
                        </span>
                        <span className="text-foreground font-medium">
                          {stat.playerNickname || stat.playerName}
                        </span>
                      </div>
                      <span className="text-primary font-bold">{stat.tournamentWins}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Most Match Wins */}
          {leaderboardMatchWins.length > 0 && (
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  Most Match Wins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboardMatchWins.slice(0, 10).map((stat, index) => (
                    <div
                      key={stat.playerId}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground font-bold w-6 text-center">
                          {index + 1}
                        </span>
                        <span className="text-foreground font-medium">
                          {stat.playerNickname || stat.playerName}
                        </span>
                      </div>
                      <span className="text-primary font-bold">{stat.matchWins}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Highest Win Percentage */}
          {leaderboardWinPercentage.length > 0 && (
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Highest Win Percentage
                  <span className="text-xs text-muted-foreground font-normal">(min. 3 matches)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboardWinPercentage.slice(0, 10).map((stat, index) => (
                    <div
                      key={stat.playerId}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground font-bold w-6 text-center">
                          {index + 1}
                        </span>
                        <div>
                          <span className="text-foreground font-medium">
                            {stat.playerNickname || stat.playerName}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            {stat.matchWins}-{stat.matchLosses}-{stat.matchDraws} ({stat.totalMatches} matches)
                          </div>
                        </div>
                      </div>
                      <span className="text-primary font-bold">{stat.winPercentage.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Longest Win Streak */}
          {leaderboardWinStreak.length > 0 && (
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Longest Win Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboardWinStreak.slice(0, 10).map((stat, index) => (
                    <div
                      key={stat.playerId}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground font-bold w-6 text-center">
                          {index + 1}
                        </span>
                        <span className="text-foreground font-medium">
                          {stat.playerNickname || stat.playerName}
                        </span>
                      </div>
                      <span className="text-primary font-bold">{stat.longestWinStreak}</span>
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