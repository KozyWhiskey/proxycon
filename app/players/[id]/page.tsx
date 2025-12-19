import { createClient } from '@/utils/supabase/server';
import { getGlobalStats } from '@/lib/stats';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Swords, Activity, History, TrendingUp } from 'lucide-react';
import { notFound } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface MatchWithParticipants {
  id: string;
  created_at: string;
  game_type: string;
  tournament: { name: string } | null;
  participants: {
    profile_id: string;
    result: string | null;
    profile: {
      username: string;
      display_name: string | null;
    };
  }[];
}

export default async function PlayerDetailPage({ params }: PageProps) {
  const { id: playerId } = await params;
  const supabase = await createClient();

  // 1. Get Global Stats to find this player's aggregate data
  const { playerStats } = await getGlobalStats(supabase);
  const stats = playerStats.find((p) => p.playerId === playerId);

  if (!stats) {
    notFound();
  }

  // 2. Fetch Player's Decks
  const { data: decks } = await supabase
    .from('decks')
    .select('*')
    .eq('owner_id', playerId)
    .order('created_at', { ascending: false });

  // 3. Fetch Recent Matches (with opponents)
  // First, find the match IDs this player participated in
  const { data: participantRows } = await supabase
    .from('match_participants')
    .select('match_id')
    .eq('profile_id', playerId)
    .order('match_id', { ascending: false }) // heuristic for recent
    .limit(10);
      
  const matchIds = participantRows?.map(r => r.match_id) || [];
    
  let recentMatches: MatchWithParticipants[] = [];
  if (matchIds.length > 0) {
    const { data } = await supabase
      .from('matches')
      .select(`
        id,
        created_at,
        game_type,
        tournament:tournaments(name),
        participants:match_participants(
          profile_id,
          result,
          profile:profiles(username, display_name)
        )
      `)
      .in('id', matchIds)
      .order('created_at', { ascending: false })
      .returns<MatchWithParticipants[]>();
      
    recentMatches = data || [];
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title={stats.playerNickname || stats.playerName}
        subtitle={`@${stats.playerName}`}
        backHref="/players"
        backLabel="All Players"
      />

      <div className="max-w-5xl mx-auto p-4 space-y-8">
        {/* Header Profile Card */}
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start bg-slate-900 p-6 rounded-xl border border-slate-800">
          <Avatar className="h-32 w-32 border-4 border-slate-800 shadow-xl">
            <AvatarImage src={stats.playerAvatarUrl || undefined} />
            <AvatarFallback className="bg-slate-800 text-slate-400 text-4xl">
              {stats.playerNickname?.[0]?.toUpperCase() || stats.playerName[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-100">{stats.playerNickname || stats.playerName}</h1>
              <p className="text-slate-400">Player since {new Date().getFullYear()} {/* TODO: Add created_at to profile */}</p>
            </div>
            
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Badge variant="secondary" className="bg-slate-800 text-slate-200 hover:bg-slate-700 px-3 py-1">
                <Swords className="w-3 h-3 mr-2 text-slate-400" />
                {stats.totalMatches} Matches
              </Badge>
              <Badge variant="secondary" className="bg-slate-800 text-slate-200 hover:bg-slate-700 px-3 py-1">
                <Trophy className="w-3 h-3 mr-2 text-yellow-500" />
                {stats.tournamentWins} Wins
              </Badge>
              <Badge variant="secondary" className="bg-slate-800 text-slate-200 hover:bg-slate-700 px-3 py-1">
                <TrendingUp className="w-3 h-3 mr-2 text-cyan-500" />
                {stats.winPercentage.toFixed(0)}% Win Rate
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Stats & Decks */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Detailed Stats */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-500" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-950/50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-500">{stats.matchWins}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Wins</div>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-500">{stats.matchLosses}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Losses</div>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-slate-300">{stats.matchDraws}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Draws</div>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-500">{stats.longestWinStreak}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Best Streak</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Decks */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <Swords className="w-5 h-5 text-slate-400" />
                  Decks ({decks?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!decks || decks.length === 0 ? (
                  <p className="text-slate-500 text-sm">No decks created yet.</p>
                ) : (
                  <div className="space-y-3">
                    {decks.map((deck) => (
                      <div key={deck.id} className="flex items-start gap-4 p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                        {/* Deck Image / Placeholder */}
                        <div className="flex-shrink-0 w-16 h-24 rounded bg-slate-800 overflow-hidden relative border border-slate-700">
                          {deck.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={deck.image_url} 
                              alt={deck.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-900">
                              <Swords className="w-6 h-6 text-slate-600" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-200 truncate">{deck.name}</div>
                          <div className="text-xs text-yellow-500 font-medium mb-1">
                            {deck.format || 'Casual'} • {deck.commander_name || 'No Commander'}
                          </div>
                          {deck.description && (
                            <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                              {deck.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Recent Activity */}
          <div className="space-y-6">
            <Card className="bg-slate-900 border-slate-800 h-full">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-400" />
                  Recent Matches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentMatches.length === 0 ? (
                    <p className="text-slate-500 text-sm">No matches played recently.</p>
                  ) : (
                    recentMatches.map((match) => {
                      const myParticipant = match.participants.find((p) => p.profile_id === playerId);
                      const opponents = match.participants.filter((p) => p.profile_id !== playerId);
                      const result = myParticipant?.result;
                      
                      let resultColor = 'text-slate-400';
                      if (result === 'win') resultColor = 'text-green-500';
                      if (result === 'loss') resultColor = 'text-red-500';
                      if (result === 'draw') resultColor = 'text-yellow-500';

                      return (
                        <div key={match.id} className="p-3 bg-slate-950/30 rounded-lg border border-slate-800/50">
                          <div className="flex justify-between items-start mb-2">
                            <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px] h-5">
                              {match.tournament?.name || 'Casual'}
                            </Badge>
                            <span className="text-[10px] text-slate-600">
                              {match.created_at ? formatDistanceToNow(new Date(match.created_at), { addSuffix: true }) : 'Unknown date'}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-slate-300">
                              <span className="text-slate-500 text-xs">vs</span>{' '}
                              {opponents.length > 0 
                                ? opponents.map((o) => o.profile.display_name || o.profile.username).join(', ') 
                                : 'Unknown'}
                            </div>
                            <div className={`font-bold capitalize ${resultColor}`}>
                              {result || 'Pending'}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}