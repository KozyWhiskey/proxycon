import { createClient } from '@/utils/supabase/server';
import { getGlobalStats } from '@/lib/stats';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Trophy, Swords, User, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default async function PlayersPage() {
  const supabase = await createClient();
  const { playerStats } = await getGlobalStats(supabase);

  // Sort players: Most active first, then alphabetical
  const sortedPlayers = [...playerStats].sort((a, b) => {
    if (b.totalMatches !== a.totalMatches) {
      return b.totalMatches - a.totalMatches;
    }
    return a.playerName.localeCompare(b.playerName);
  });

  return (
    <main className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Players"
        subtitle="Meet the community"
        backHref="/"
        backLabel="Home"
      />

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedPlayers.map((player) => (
            <Card key={player.playerId} className="glass-panel flex flex-col hover:border-primary/50 transition-all duration-300 group">
              <CardHeader className="flex flex-row items-center gap-4 pb-4 border-b border-white/5">
                <Avatar className="h-16 w-16 border-2 border-white/10 shadow-xl group-hover:border-primary/30 transition-colors">
                  <AvatarImage src={player.playerAvatarUrl || undefined} />
                  <AvatarFallback className="bg-white/5 text-muted-foreground text-lg">
                    {player.playerNickname?.[0]?.toUpperCase() || player.playerName[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden">
                  <CardTitle className="text-foreground text-lg truncate font-heading tracking-wide" title={player.playerNickname || player.playerName}>
                    {player.playerNickname || player.playerName}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground/60 truncate font-mono uppercase tracking-wider">@{player.playerName}</p>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between space-y-6 pt-6">
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="bg-white/5 border border-white/5 p-2 rounded-lg">
                    <div className="text-muted-foreground/40 text-[10px] uppercase tracking-widest mb-1 font-heading">Matches</div>
                    <div className="text-foreground font-bold font-mono">{player.totalMatches}</div>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-2 rounded-lg">
                    <div className="text-muted-foreground/40 text-[10px] uppercase tracking-widest mb-1 font-heading">Win %</div>
                    <div className="text-primary font-bold font-mono">
                      {player.totalMatches > 0 ? player.winPercentage.toFixed(0) : '-'}%
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-2 rounded-lg">
                    <div className="text-muted-foreground/40 text-[10px] uppercase tracking-widest mb-1 font-heading">Titles</div>
                    <div className="text-primary font-bold font-mono">{player.tournamentWins}</div>
                  </div>
                </div>

                <Button asChild variant="outline" className="w-full bg-white/5 border-white/10 hover:bg-white/10 group/btn">
                  <Link href={`/players/${player.playerId}`} className="flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] font-bold">
                    View Profile
                    <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}

          {sortedPlayers.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground/40 py-12 italic font-heading">
              No players found.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}