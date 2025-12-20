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
    <main className="min-h-screen bg-background pb-24">
      <PageHeader
        title={stats.playerNickname || stats.playerName}
        subtitle={`@${stats.playerName}`}
        backHref="/players"
        backLabel="All Players"
      />

      <div className="max-w-5xl mx-auto p-4 space-y-8">
        {/* Header Profile Card */}
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start glass-panel p-6 rounded-xl">
          <Avatar className="h-32 w-32 border-4 border-white/5 shadow-2xl">
            <AvatarImage src={stats.playerAvatarUrl || undefined} />
            <AvatarFallback className="bg-white/5 text-muted-foreground text-4xl">
              {stats.playerNickname?.[0]?.toUpperCase() || stats.playerName[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground font-heading">{stats.playerNickname || stats.playerName}</h1>
              <p className="text-muted-foreground">Player since {new Date().getFullYear()} {/* TODO: Add created_at to profile */}</p>
            </div>
            
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Badge variant="secondary" className="bg-white/5 text-foreground hover:bg-white/10 px-3 py-1 border-white/5">
                <Swords className="w-3 h-3 mr-2 text-muted-foreground" />
                {stats.totalMatches} Matches
              </Badge>
              <Badge variant="secondary" className="bg-white/5 text-foreground hover:bg-white/10 px-3 py-1 border-white/5">
                <Trophy className="w-3 h-3 mr-2 text-primary" />
                {stats.tournamentWins} Wins
              </Badge>
              <Badge variant="secondary" className="bg-white/5 text-foreground hover:bg-white/10 px-3 py-1 border-white/5">
                <TrendingUp className="w-3 h-3 mr-2 text-primary" />
                {stats.winPercentage.toFixed(0)}% Win Rate
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Stats & Decks */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Detailed Stats */}
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white/5 p-4 rounded-lg text-center border border-white/5">
                    <div className="text-2xl font-bold text-emerald-500">{stats.matchWins}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Wins</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg text-center border border-white/5">
                    <div className="text-2xl font-bold text-rose-500">{stats.matchLosses}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Losses</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg text-center border border-white/5">
                    <div className="text-2xl font-bold text-muted-foreground">{stats.matchDraws}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Draws</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg text-center border border-white/5">
                    <div className="text-2xl font-bold text-primary">{stats.longestWinStreak}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Best Streak</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Decks */}
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Swords className="w-5 h-5 text-muted-foreground" />
                  Decks ({decks?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!decks || decks.length === 0 ? (
                  <p className="text-muted-foreground text-sm italic">No decks created yet.</p>
                ) : (
                  <div className="space-y-3">
                    {decks.map((deck) => (
                      <div key={deck.id} className="flex items-start gap-4 p-3 bg-white/5 rounded-lg border border-white/5">
                        {/* Deck Image / Placeholder */}
                        <div className="flex-shrink-0 w-16 h-24 rounded bg-zinc-900 overflow-hidden relative border border-white/10">
                          {deck.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={deck.image_url} 
                              alt={deck.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Swords className="w-6 h-6 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">{deck.name}</div>
                          <div className="text-xs text-primary font-medium mb-1">
                            {deck.format || 'Casual'} • {deck.commander_name || 'No Commander'}
                          </div>
                          {deck.description && (
                            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
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
            <Card className="glass-panel h-full">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <History className="w-5 h-5 text-muted-foreground" />
                  Recent Matches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentMatches.length === 0 ? (
                    <p className="text-muted-foreground text-sm italic">No matches played recently.</p>
                  ) : (
                    recentMatches.map((match) => {
                      const myParticipant = match.participants.find((p) => p.profile_id === playerId);
                      const opponents = match.participants.filter((p) => p.profile_id !== playerId);
                      const result = myParticipant?.result;
                      
                      let resultColor = 'text-muted-foreground';
                      if (result === 'win') resultColor = 'text-emerald-500';
                      if (result === 'loss') resultColor = 'text-rose-500';
                      if (result === 'draw') resultColor = 'text-primary';

                      return (
                        <div key={match.id} className="p-3 bg-white/5 rounded-lg border border-white/5">
                          <div className="flex justify-between items-start mb-2">
                            <Badge variant="outline" className="border-white/10 text-muted-foreground text-[10px] h-5 bg-transparent">
                              {match.tournament?.name || 'Casual'}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground/40">
                              {match.created_at ? formatDistanceToNow(new Date(match.created_at), { addSuffix: true }) : 'Unknown date'}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-foreground">
                              <span className="text-muted-foreground text-xs">vs</span>{' '}
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
