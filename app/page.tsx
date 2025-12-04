import { createClient } from '@/utils/supabase/server';
import { getCurrentUser, getCurrentUserId } from '@/lib/get-current-user';
import MyStats from '@/components/dashboard/my-stats';
import ActiveTournament from '@/components/dashboard/active-tournament';
import Feed from '@/components/dashboard/feed';
import UserHeader from '@/components/dashboard/user-header';
import QuickActions from '@/components/dashboard/quick-actions';

export default async function Home() {
  const supabase = await createClient();
  const currentUser = await getCurrentUser();
  const currentUserId = await getCurrentUserId();

  if (!currentUser || !currentUserId) {
    // This shouldn't happen due to middleware, but handle gracefully
    return (
      <main className="min-h-screen bg-slate-950 p-4">
        <div className="max-w-2xl mx-auto">
          <p className="text-slate-400">Please log in to view your dashboard.</p>
        </div>
      </main>
    );
  }

  // Fetch all active tournaments
  const { data: activeTournaments } = await supabase
    .from('tournaments')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  // Fetch current user's match for each active tournament
  const tournamentsWithMatches = await Promise.all(
    (activeTournaments || []).map(async (tournament) => {
      // Get all matches for this tournament
      const { data: allMatches } = await supabase
        .from('matches')
        .select('id, round_number')
        .eq('tournament_id', tournament.id)
        .order('round_number', { ascending: false });

      let currentMatch = null;
      if (allMatches && allMatches.length > 0) {
        // Find matches where the current user is a participant
        for (const match of allMatches) {
          const { data: participants } = await supabase
            .from('match_participants')
            .select('id, player_id, result')
            .eq('match_id', match.id);

          if (participants?.some((p) => p.player_id === currentUserId)) {
            // Fetch player details for all participants
            const playerIds = participants.map((p) => p.player_id);
            const { data: players } = await supabase
              .from('players')
              .select('id, name, nickname')
              .in('id', playerIds);

            const playersMap = new Map(players?.map((p) => [p.id, p]) || []);

            currentMatch = {
              id: match.id,
              round_number: match.round_number,
              participants: participants.map((p) => ({
                id: p.id,
                player_id: p.player_id,
                result: p.result,
                player: {
                  id: playersMap.get(p.player_id)?.id || p.player_id,
                  name: playersMap.get(p.player_id)?.name || '',
                  nickname: playersMap.get(p.player_id)?.nickname || null,
                },
              })),
            };
            break;
          }
        }
      }

      return {
        tournament,
        currentMatch,
      };
    })
  );

  // Fetch last 10 matches
  const { data: recentMatches } = await supabase
    .from('matches')
    .select('id, tournament_id, round_number, game_type, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch participants for each match and join with player data
  const formattedMatches = await Promise.all(
    (recentMatches || []).map(async (match) => {
      const { data: participants } = await supabase
        .from('match_participants')
        .select('id, player_id, result')
        .eq('match_id', match.id);

      if (!participants || participants.length === 0) {
        return {
          id: match.id,
          tournament_id: match.tournament_id,
          round_number: match.round_number,
          game_type: match.game_type,
          created_at: match.created_at,
          participants: [],
        };
      }

      // Fetch player details
      const playerIds = participants.map((p) => p.player_id);
      const { data: players } = await supabase
        .from('players')
        .select('id, name, nickname')
        .in('id', playerIds);

      const playersMap = new Map(players?.map((p) => [p.id, p]) || []);

      return {
        id: match.id,
        tournament_id: match.tournament_id,
        round_number: match.round_number,
        game_type: match.game_type,
        created_at: match.created_at,
        participants: participants.map((p) => ({
          id: p.id,
          player_id: p.player_id,
          result: p.result,
          player: {
            id: playersMap.get(p.player_id)?.id || p.player_id,
            name: playersMap.get(p.player_id)?.name || '',
            nickname: playersMap.get(p.player_id)?.nickname || null,
          },
        })),
      };
    })
  );

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      {/* User Header - Sticky at top */}
      <div className="sticky top-0 z-10">
        <UserHeader
          userName={currentUser.name}
          userNickname={currentUser.nickname}
        />
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-100 mb-2">ProxyCon 2025</h1>
          <p className="text-slate-400 text-sm">Your tournament companion</p>
        </div>
        
        <MyStats wins={currentUser.wins || 0} />
        
        <QuickActions />
        
        {tournamentsWithMatches.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-100">Active Tournaments</h2>
            {tournamentsWithMatches.map(({ tournament, currentMatch }) => (
              <ActiveTournament
                key={tournament.id}
                tournament={tournament}
                currentMatch={currentMatch}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        ) : (
          <ActiveTournament
            tournament={null}
            currentMatch={null}
            currentUserId={currentUserId}
          />
        )}
        
        <Feed matches={formattedMatches} />
      </div>
    </main>
  );
}