import { createClient } from '@/utils/supabase/server';
import { getCurrentUser, getCurrentUserId } from '@/lib/get-current-user';
import MyStats from '@/components/dashboard/my-stats';
import ActiveTournament from '@/components/dashboard/active-tournament';
import Feed from '@/components/dashboard/feed';
import UserHeader from '@/components/dashboard/user-header';
import QuickActions from '@/components/dashboard/quick-actions';
import {
  calculateStandings,
  sortStandings,
  convertDbMatchToMatchResult,
} from '@/lib/swiss-pairing';

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

  // Calculate user stats
  // Get all match participants for the current user
  const { data: allUserParticipants } = await supabase
    .from('match_participants')
    .select('match_id, result, games_won')
    .eq('player_id', currentUserId);

  // Get match details for all user's matches
  const matchIds = allUserParticipants?.map((p) => p.match_id) || [];
  const { data: allUserMatches } = await supabase
    .from('matches')
    .select('id, tournament_id')
    .in('id', matchIds);

  const matchesMap = new Map(allUserMatches?.map((m) => [m.id, m]) || []);

  // Calculate casual wins with details (matches with tournament_id = null and result = 'win' or '1st')
  const casualWinMatches = (allUserParticipants || [])
    .filter((p) => {
      const match = matchesMap.get(p.match_id);
      return (
        match &&
        match.tournament_id === null &&
        (p.result === 'win' || p.result === '1st')
      );
    })
    .map((p) => matchesMap.get(p.match_id))
    .filter((m): m is NonNullable<typeof m> => m !== undefined);

  const casualWins = casualWinMatches.length;
  let casualWinDetails: Array<{ gameType: string; createdAt: string }> = [];

  // Fetch game_type for casual wins if any exist
  if (casualWins > 0) {
    const casualWinMatchIds = casualWinMatches.map((m) => m.id);
    const { data: casualMatches } = await supabase
      .from('matches')
      .select('id, game_type, created_at')
      .in('id', casualWinMatchIds)
      .order('created_at', { ascending: false });

    casualWinDetails =
      casualMatches?.map((m) => ({
        gameType: m.game_type || 'casual',
        createdAt: m.created_at,
      })) || [];
  }

  // Calculate tournament placement stats (1st, 2nd, 3rd)
  // Get all completed tournaments the user participated in
  const { data: userTournamentParticipants } = await supabase
    .from('tournament_participants')
    .select('tournament_id')
    .eq('player_id', currentUserId);

  const userTournamentIds =
    userTournamentParticipants?.map((p) => p.tournament_id) || [];

  let tournamentFirstPlace = 0;
  let tournamentSecondPlace = 0;
  let tournamentThirdPlace = 0;
  let tournamentLosses = 0;
  let tournamentDraws = 0;
  let tournamentTotalMatches = 0;

  if (userTournamentIds.length > 0) {
    // Get all completed tournaments
    const { data: completedTournaments } = await supabase
      .from('tournaments')
      .select('id')
      .in('id', userTournamentIds)
      .eq('status', 'completed');

    // Calculate standings for each completed tournament
    for (const tournament of completedTournaments || []) {
      // Get all participants
      const { data: participants } = await supabase
        .from('tournament_participants')
        .select('player_id')
        .eq('tournament_id', tournament.id);

      const playerIds = participants?.map((p) => p.player_id) || [];

      // Get all matches for this tournament
      const { data: matches } = await supabase
        .from('matches')
        .select('id, round_number')
        .eq('tournament_id', tournament.id)
        .order('round_number', { ascending: true });

      if (!matches || matches.length === 0) continue;

      // Get all match participants
      const matchIds = matches.map((m) => m.id);
      const { data: allMatchParticipants } = await supabase
        .from('match_participants')
        .select('match_id, player_id, result, games_won')
        .in('match_id', matchIds);

      // Build match history
      const participantsByMatch = new Map<
        string,
        Array<{ playerId: string; result: 'win' | 'loss' | 'draw' | null }>
      >();
      allMatchParticipants?.forEach((p) => {
        if (!participantsByMatch.has(p.match_id)) {
          participantsByMatch.set(p.match_id, []);
        }
        participantsByMatch.get(p.match_id)!.push({
          playerId: p.player_id,
          result: p.result as 'win' | 'loss' | 'draw' | null,
        });
      });

      // Convert to MatchResult format
      const matchHistory = [];
      for (const match of matches) {
        const matchParticipants = participantsByMatch.get(match.id) || [];
        if (matchParticipants.length > 0) {
          matchHistory.push(
            convertDbMatchToMatchResult(
              match.id,
              match.round_number || 1,
              matchParticipants.map((p) => ({
                playerId: p.playerId,
                result: p.result,
              }))
            )
          );
        }
      }

      // Calculate standings
      const standingsMap = calculateStandings(playerIds, matchHistory);
      const sortedStandings = sortStandings(
        Array.from(standingsMap.values())
      );

      // Find user's rank
      const userRank =
        sortedStandings.findIndex((s) => s.playerId === currentUserId) + 1;

      if (userRank === 1) {
        tournamentFirstPlace++;
      } else if (userRank === 2) {
        tournamentSecondPlace++;
      } else if (userRank === 3) {
        tournamentThirdPlace++;
      }
    }

    // Calculate tournament match record (wins, losses, draws)
    const tournamentParticipants = (allUserParticipants || []).filter((p) => {
      const match = matchesMap.get(p.match_id);
      return match && match.tournament_id !== null && p.result !== null;
    });

    tournamentLosses = tournamentParticipants.filter(
      (p) => p.result === 'loss'
    ).length;
    tournamentDraws = tournamentParticipants.filter(
      (p) => p.result === 'draw'
    ).length;
    tournamentTotalMatches = tournamentParticipants.length;
  }

  const tournamentWins = tournamentTotalMatches - tournamentLosses - tournamentDraws;
  const tournamentWinRate =
    tournamentTotalMatches > 0
      ? ((tournamentWins / tournamentTotalMatches) * 100).toFixed(1)
      : '0.0';

  // Fetch matches where the current user participated
  // First, get all match IDs where the user is a participant
  const { data: userMatchParticipants } = await supabase
    .from('match_participants')
    .select('match_id')
    .eq('player_id', currentUserId);

  const userMatchIds =
    userMatchParticipants?.map((p) => p.match_id) || [];

  // Fetch the last 10 matches where the user participated
  let recentMatches: Array<{
    id: string;
    tournament_id: string | null;
    round_number: number | null;
    game_type: string | null;
    created_at: string;
  }> = [];
  if (userMatchIds.length > 0) {
    const { data: matches } = await supabase
      .from('matches')
      .select('id, tournament_id, round_number, game_type, created_at')
      .in('id', userMatchIds)
      .order('created_at', { ascending: false })
      .limit(10);
    recentMatches = matches || [];
  }

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
          userColor={currentUser.color}
          userAvatarUrl={currentUser.avatar_url}
        />
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-100 mb-2">ProxyCon 2025</h1>
          <p className="text-slate-400 text-sm">Your tournament companion</p>
        </div>
        
        <MyStats
          casualWins={casualWins}
          casualWinDetails={casualWinDetails}
          tournamentFirstPlace={tournamentFirstPlace}
          tournamentSecondPlace={tournamentSecondPlace}
          tournamentThirdPlace={tournamentThirdPlace}
          tournamentWins={tournamentWins}
          tournamentLosses={tournamentLosses}
          tournamentDraws={tournamentDraws}
          tournamentWinRate={tournamentWinRate}
        />
        
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