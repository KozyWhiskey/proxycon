import { createClient } from '@/utils/supabase/server';
import { getGlobalStats } from '@/lib/stats';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Trophy, Swords, User } from 'lucide-react';
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
    <main className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title="Players"
        subtitle="Meet the community"
        backHref="/"
        backLabel="Home"
      />

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPlayers.map((player) => (
            <Card key={player.playerId} className="bg-slate-900 border-slate-800 flex flex-col">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <Avatar className="h-16 w-16 border-2 border-slate-700">
                  <AvatarImage src={player.playerAvatarUrl || undefined} />
                  <AvatarFallback className="bg-slate-800 text-slate-400 text-lg">
                    {player.playerNickname?.[0]?.toUpperCase() || player.playerName[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden">
                  <CardTitle className="text-slate-100 text-lg truncate" title={player.playerNickname || player.playerName}>
                    {player.playerNickname || player.playerName}
                  </CardTitle>
                  <p className="text-sm text-slate-500 truncate">@{player.playerName}</p>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="bg-slate-800/50 p-2 rounded">
                    <div className="text-slate-400 text-xs mb-1">Matches</div>
                    <div className="text-slate-100 font-bold">{player.totalMatches}</div>
                  </div>
                  <div className="bg-slate-800/50 p-2 rounded">
                    <div className="text-slate-400 text-xs mb-1">Win %</div>
                    <div className="text-cyan-500 font-bold">
                      {player.totalMatches > 0 ? player.winPercentage.toFixed(0) : '-'}%
                    </div>
                  </div>
                  <div className="bg-slate-800/50 p-2 rounded">
                    <div className="text-slate-400 text-xs mb-1">Titles</div>
                    <div className="text-yellow-500 font-bold">{player.tournamentWins}</div>
                  </div>
                </div>

                <Button asChild className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700">
                  <Link href={`/players/${player.playerId}`}>
                    View Profile
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}

          {sortedPlayers.length === 0 && (
            <div className="col-span-full text-center text-slate-500 py-12">
              No players found.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
