import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Users, Sword, Crown, Flame, Clock, Activity } from 'lucide-react';
import Link from 'next/link';
import { getGlobalStats, PlayerStats } from '@/lib/stats';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

export default async function StatsPage() {
  const supabase = await createClient();

  const {
    playerStats,
    tournamentWinners,
    totalTournaments,
    totalCasualGames,
    recentMatches,
    eventStats
  } = await getGlobalStats(supabase);

  // --- Helper Functions ---
  const getPlayerName = (id: string) => {
    const p = playerStats.find(p => p.playerId === id);
    return p ? (p.playerNickname || p.playerName) : 'Unknown';
  };

  // --- Derived Stats ---
  const topTournamentWinner = [...playerStats].sort((a, b) => b.tournamentWins - a.tournamentWins)[0];
  const topMatchWinner = [...playerStats].sort((a, b) => b.matchWins - a.matchWins)[0];
  const topStreak = [...playerStats].sort((a, b) => b.currentWinStreak - a.currentWinStreak)[0];

  // --- Render Functions ---

  const PlayerRow = ({ stat, type = 'global' }: { stat: PlayerStats, type?: 'global' | 'casual' | 'tournament' }) => (
      <TableRow key={stat.playerId} className="border-white/5 hover:bg-white/5">
        <TableCell>
            <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 border border-white/10">
                    <AvatarImage src={stat.playerAvatarUrl || undefined} />
                    <AvatarFallback>{stat.playerNickname?.[0] || stat.playerName[0]}</AvatarFallback>
                </Avatar>
                <div className="font-medium text-foreground">
                    {stat.playerNickname || stat.playerName}
                </div>
            </div>
        </TableCell>
        {type === 'global' && (
            <>
                <TableCell className="text-center text-primary font-semibold">{stat.tournamentWins}</TableCell>
                <TableCell className="text-center text-emerald-500 font-bold">{stat.matchWins}</TableCell>
                <TableCell className="text-center text-rose-500">{stat.matchLosses}</TableCell>
                <TableCell className="text-center text-muted-foreground">{stat.winPercentage.toFixed(0)}%</TableCell>
                <TableCell className="text-center">
                    {stat.currentWinStreak > 2 ? (
                         <div className="flex items-center justify-center gap-1 text-orange-500 font-bold">
                             <Flame className="w-4 h-4" /> {stat.currentWinStreak}
                         </div>
                    ) : (
                        <span className="text-muted-foreground">{stat.currentWinStreak}</span>
                    )}
                </TableCell>
            </>
        )}
        {type === 'casual' && (
             <>
                <TableCell className="text-center text-emerald-500 font-bold">{stat.casualMatchWins}</TableCell>
                 <TableCell className="text-center text-muted-foreground">
                     {((stat.casualMatchWins / (stat.casualMatchesPlayed || 1)) * 100).toFixed(0)}%
                 </TableCell>
            </>
        )}
         {type === 'tournament' && (
             <>
                <TableCell className="text-center text-primary font-bold">{stat.tournamentMatchWins}</TableCell>
                <TableCell className="text-center text-muted-foreground">
                     {((stat.tournamentMatchWins / (stat.tournamentMatchesPlayed || 1)) * 100).toFixed(0)}%
                 </TableCell>
            </>
        )}
      </TableRow>
  );

  return (
    <main className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Stats & Records"
        subtitle="Global leaderboards, event history, and hall of fame."
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
      
      <div className="max-w-7xl mx-auto p-4 space-y-8">
        
        {/* Hero Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <Card className="glass-panel border-primary/20 bg-primary/5">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <Trophy className="w-8 h-8 text-primary mb-2" />
                    <div className="text-xs text-primary uppercase font-bold tracking-wider">Top Champion</div>
                    {topTournamentWinner ? (
                        <>
                             <div className="text-xl font-heading font-bold text-foreground mt-1">
                                {topTournamentWinner.playerNickname || topTournamentWinner.playerName}
                             </div>
                             <div className="text-sm text-muted-foreground">{topTournamentWinner.tournamentWins} Tournaments</div>
                        </>
                    ) : <div className="text-sm text-muted-foreground mt-1">-</div>}
                </CardContent>
             </Card>

             <Card className="glass-panel">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <Crown className="w-8 h-8 text-emerald-500 mb-2" />
                    <div className="text-xs text-emerald-500 uppercase font-bold tracking-wider">Match Leader</div>
                    {topMatchWinner ? (
                        <>
                             <div className="text-xl font-heading font-bold text-foreground mt-1">
                                {topMatchWinner.playerNickname || topMatchWinner.playerName}
                             </div>
                             <div className="text-sm text-muted-foreground">{topMatchWinner.matchWins} Wins</div>
                        </>
                    ) : <div className="text-sm text-muted-foreground mt-1">-</div>}
                </CardContent>
             </Card>

              <Card className="glass-panel">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <Flame className="w-8 h-8 text-orange-500 mb-2" />
                    <div className="text-xs text-orange-500 uppercase font-bold tracking-wider">Hot Streak</div>
                    {topStreak && topStreak.currentWinStreak > 0 ? (
                        <>
                             <div className="text-xl font-heading font-bold text-foreground mt-1">
                                {topStreak.playerNickname || topStreak.playerName}
                             </div>
                             <div className="text-sm text-muted-foreground">{topStreak.currentWinStreak} Wins in a row</div>
                        </>
                    ) : <div className="text-sm text-muted-foreground mt-1">No Active Streaks</div>}
                </CardContent>
             </Card>

             <Card className="glass-panel">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <Activity className="w-8 h-8 text-cyan-500 mb-2" />
                    <div className="text-xs text-cyan-500 uppercase font-bold tracking-wider">Total Games</div>
                    <div className="text-xl font-heading font-bold text-foreground mt-1">
                        {totalTournaments * 3 + totalCasualGames} {/* Approx */}
                    </div>
                     <div className="text-sm text-muted-foreground">{totalCasualGames} Casual / {totalTournaments} Events</div>
                </CardContent>
             </Card>
        </div>

        <Tabs defaultValue="global" className="space-y-6">
            <TabsList className="bg-zinc-900/50 border border-white/10 p-1">
                <TabsTrigger value="global" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Global</TabsTrigger>
                <TabsTrigger value="events" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Events</TabsTrigger>
                <TabsTrigger value="casual" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Casual</TabsTrigger>
            </TabsList>

            {/* --- GLOBAL TAB --- */}
            <TabsContent value="global" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Leaderboard */}
                    <Card className="glass-panel lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" /> Global Standings
                            </CardTitle>
                            <CardDescription>Aggregate statistics across all events and casual play.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableHead className="text-muted-foreground">Player</TableHead>
                                        <TableHead className="text-center text-muted-foreground">Tourneys</TableHead>
                                        <TableHead className="text-center text-muted-foreground">Wins</TableHead>
                                        <TableHead className="text-center text-muted-foreground">Losses</TableHead>
                                        <TableHead className="text-center text-muted-foreground">Win %</TableHead>
                                        <TableHead className="text-center text-muted-foreground">Streak</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {playerStats.length > 0 ? playerStats
                                        .sort((a, b) => b.tournamentWins - a.tournamentWins || b.matchWins - a.matchWins)
                                        .map(stat => (
                                        <PlayerRow key={stat.playerId} stat={stat} type="global" />
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                                                No stats recorded yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Recent Activity Feed */}
                    <div className="space-y-6">
                         <Card className="glass-panel">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-cyan-500" /> Recent Activity
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {recentMatches.length > 0 ? recentMatches.map((match) => (
                                    <div key={match.id} className="flex flex-col gap-2 p-3 rounded-lg bg-white/5 border border-white/5">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{match.gameType.toUpperCase()}</span>
                                            <span>{formatDistanceToNow(new Date(match.completedAt), { addSuffix: true })}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            {match.isDraw ? (
                                                <div className="text-sm font-medium text-foreground">Draw</div>
                                            ) : (
                                                 <div className="text-sm font-medium text-emerald-500">
                                                    {match.winnerIds.map(getPlayerName).join(', ')} won
                                                 </div>
                                            )}
                                        </div>
                                        {match.eventName && (
                                            <Badge variant="outline" className="w-fit text-[10px] h-5 bg-primary/10 text-primary border-primary/20">
                                                {match.eventName}
                                            </Badge>
                                        )}
                                    </div>
                                )) : (
                                    <div className="text-sm text-muted-foreground text-center py-4">No recent matches.</div>
                                )}
                            </CardContent>
                         </Card>

                         {/* Tournament Hall of Fame (Mini) */}
                         <Card className="glass-panel">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Medal className="w-5 h-5 text-primary" /> Recent Champions
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {tournamentWinners.slice(0, 5).map((winner) => (
                                    <div key={winner.tournamentId} className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground truncate max-w-[120px]">{winner.tournamentName}</span>
                                        <div className="flex items-center gap-2">
                                            <Crown className="w-3 h-3 text-primary" />
                                            <span className="font-medium text-foreground">{winner.winnerNickname || winner.winnerName}</span>
                                        </div>
                                    </div>
                                ))}
                                {tournamentWinners.length === 0 && (
                                    <div className="text-sm text-muted-foreground text-center py-4">No champions yet.</div>
                                )}
                            </CardContent>
                         </Card>
                    </div>
                </div>
            </TabsContent>

            {/* --- EVENTS TAB --- */}
            <TabsContent value="events" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {eventStats.length > 0 ? eventStats.map((event) => (
                        <Card key={event.id} className="glass-panel hover:border-primary/50 transition-colors">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">{event.name}</CardTitle>
                                    <Badge variant="secondary">{event.totalTournaments} Tourneys</Badge>
                                </div>
                                <CardDescription>{event.uniquePlayers} Players Participated</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-white/5 rounded border border-white/5 text-center">
                                            <div className="text-2xl font-bold text-foreground">{event.totalMatches}</div>
                                            <div className="text-xs text-muted-foreground uppercase">Matches</div>
                                        </div>
                                         <div className="p-3 bg-white/5 rounded border border-white/5 text-center">
                                            <div className="text-2xl font-bold text-foreground">{event.totalTournaments}</div>
                                            <div className="text-xs text-muted-foreground uppercase">Events</div>
                                        </div>
                                    </div>
                                    <Button asChild className="w-full" variant="outline">
                                        <Link href={`/events/${event.id}`}>View Dashboard</Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )) : (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            No events found.
                        </div>
                    )}
                </div>
            </TabsContent>

            {/* --- CASUAL TAB --- */}
            <TabsContent value="casual" className="space-y-6">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="glass-panel">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sword className="w-5 h-5 text-emerald-500" /> Casual Leaders
                            </CardTitle>
                            <CardDescription>Most wins in non-tournament games (Commander, 1v1, etc).</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableHead className="text-muted-foreground">Player</TableHead>
                                        <TableHead className="text-center text-muted-foreground">Casual Wins</TableHead>
                                        <TableHead className="text-center text-muted-foreground">Win Rate</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {playerStats
                                        .filter(p => p.casualMatchesPlayed > 0)
                                        .sort((a, b) => b.casualMatchWins - a.casualMatchWins)
                                        .map(stat => (
                                        <PlayerRow key={stat.playerId} stat={stat} type="casual" />
                                    ))}
                                    {playerStats.every(p => p.casualMatchesPlayed === 0) && (
                                         <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                                                No casual games recorded.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                     <Card className="glass-panel">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-primary" /> Tournament Specialists
                            </CardTitle>
                            <CardDescription>Most wins in competitive tournament matches.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableHead className="text-muted-foreground">Player</TableHead>
                                        <TableHead className="text-center text-muted-foreground">Tourney Wins</TableHead>
                                        <TableHead className="text-center text-muted-foreground">Win Rate</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {playerStats
                                        .filter(p => p.tournamentMatchesPlayed > 0)
                                        .sort((a, b) => b.tournamentMatchWins - a.tournamentMatchWins)
                                        .map(stat => (
                                        <PlayerRow key={stat.playerId} stat={stat} type="tournament" />
                                    ))}
                                     {playerStats.every(p => p.tournamentMatchesPlayed === 0) && (
                                         <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                                                No tournament matches recorded.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                 </div>
            </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}