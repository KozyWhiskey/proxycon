import { createClient } from '@/utils/supabase/server';
import { getCurrentUser } from '@/lib/get-current-user';
import { redirect } from 'next/navigation';
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
import { Button } from '@/components/ui/button';
import { Trophy, Plus } from 'lucide-react';
import Link from 'next/link';

interface EventDashboardProps {
  params: Promise<{ id: string }>;
}

export default async function EventDashboard({ params }: EventDashboardProps) {
  const { id: eventId } = await params;
  const supabase = await createClient();
  
  // Auth Check
  const authData = await getCurrentUser();
  if (!authData || !authData.user) {
    redirect('/login');
  }

  const { user, profile } = authData;

  // Check if user is a participant in this event
  const { data: participation } = await supabase
    .from('event_participants')
    .select('role')
    .eq('event_id', eventId)
    .eq('profile_id', user.id)
    .single();

  if (!participation) {
    // User not in event -> Redirect to global landing or showing "Join"
    redirect('/');
  }

  // Check for linked player record
  const { data: linkedPlayer } = await supabase
    .from('players')
    .select('*')
    .eq('profile_id', user.id)
    .single();

  // If no linked player, redirect to global dashboard to handle claiming
  if (!linkedPlayer) {
    redirect('/');
  }

  const currentUser = linkedPlayer;
  const currentUserId = linkedPlayer.id;

  // Fetch Event Details
  const { data: event } = await supabase
    .from('events')
    .select('name')
    .eq('id', eventId)
    .single();

  // Fetch active tournaments FOR THIS EVENT
  const { data: activeTournaments } = await supabase
    .from('tournaments')
    .select('*')
    .eq('event_id', eventId)
    .in('status', ['active', 'pending'])
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

  // Calculate user stats FOR THIS EVENT
  // We need to filter matches by event_id.
  // match_participants -> match -> event_id check

  const { data: allUserParticipants } = await supabase
    .from('match_participants')
    .select('match_id, result, games_won')
    .eq('player_id', currentUserId);

  const matchIds = allUserParticipants?.map((p) => p.match_id) || [];
  
  // Get match details, FILTERING BY EVENT_ID
  const { data: allUserMatches } = await supabase
    .from('matches')
    .select('id, tournament_id, event_id, game_type, created_at, notes')
    .in('id', matchIds)
    .eq('event_id', eventId); // Crucial filter!

  const matchesMap = new Map(allUserMatches?.map((m) => [m.id, m]) || []);

  // Filter participants to only those in matches belonging to this event
  const eventParticipants = (allUserParticipants || []).filter(p => matchesMap.has(p.match_id));

  // Calculate casual wins
  const casualWinMatches = eventParticipants
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
  
  // Build casual win details
  let casualWinDetails: Array<{
    gameType: string;
    createdAt: string;
    boardGameName?: string | null;
    opponents?: string[];
  }> = [];

  if (casualWins > 0) {
    const casualWinMatchIds = casualWinMatches.map((m) => m.id);
    
    // We already have the match data in matchesMap, but need opponents
    const { data: casualParticipants } = await supabase
      .from('match_participants')
      .select('match_id, player_id')
      .in('match_id', casualWinMatchIds);

    const participantPlayerIds = Array.from(
      new Set((casualParticipants || []).map((p) => p.player_id))
    );

    const { data: casualPlayers } = participantPlayerIds.length
      ? await supabase
          .from('players')
          .select('id, name, nickname')
          .in('id', participantPlayerIds)
      : { data: [] };

    const playersById = new Map(
      (casualPlayers || []).map((p) => [p.id, p])
    );

    const participantsByMatch = new Map<string, typeof casualParticipants>();
    (casualParticipants || []).forEach((p) => {
      const arr = participantsByMatch.get(p.match_id) || [];
      arr.push(p);
      participantsByMatch.set(p.match_id, arr);
    });

    casualWinDetails = casualWinMatches.map((m) => {
        const participantsForMatch = participantsByMatch.get(m.id) || [];
        const opponents =
          participantsForMatch
            .filter((p) => p.player_id !== currentUserId)
            .map((p) => {
              const player = playersById.get(p.player_id);
              return player?.nickname || player?.name || 'Unknown';
            }) || [];

        return {
          gameType: m.game_type || 'casual',
          createdAt: m.created_at,
          boardGameName:
            m.game_type === 'board_game' ? (m.notes || null) : null,
          opponents,
        };
      });
  }

  // Calculate tournament placement stats
  // Need to find completed tournaments IN THIS EVENT that the user participated in
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
    // Get completed tournaments filtering by EVENT_ID
    const { data: completedTournaments } = await supabase
      .from('tournaments')
      .select('id')
      .in('id', userTournamentIds)
      .eq('status', 'completed')
      .eq('event_id', eventId);

    for (const tournament of completedTournaments || []) {
      // ... (Same standings calculation logic as before)
      const { data: participants } = await supabase
        .from('tournament_participants')
        .select('player_id')
        .eq('tournament_id', tournament.id);

      const playerIds = participants?.map((p) => p.player_id) || [];

      const { data: matches } = await supabase
        .from('matches')
        .select('id, round_number')
        .eq('tournament_id', tournament.id)
        .order('round_number', { ascending: true });

      if (!matches || matches.length === 0) continue;

      const matchIds = matches.map((m) => m.id);
      const { data: allMatchParticipants } = await supabase
        .from('match_participants')
        .select('match_id, player_id, result, games_won')
        .in('match_id', matchIds);

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

      const standingsMap = calculateStandings(playerIds, matchHistory);
      const sortedStandings = sortStandings(
        Array.from(standingsMap.values())
      );

      const userRank =
        sortedStandings.findIndex((s) => s.playerId === currentUserId) + 1;

      if (userRank === 1) tournamentFirstPlace++;
      else if (userRank === 2) tournamentSecondPlace++;
      else if (userRank === 3) tournamentThirdPlace++;
    }

    // Tournament match record (wins, losses, draws) - Filtered by EVENT matches
    const tournamentParticipants = eventParticipants.filter((p) => {
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

  // Recent Matches for Feed - Filtered by EVENT_ID
  const recentMatches = (allUserMatches || [])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const formattedMatches = await Promise.all(
    recentMatches.map(async (match) => {
      const { data: participants } = await supabase
        .from('match_participants')
        .select('id, player_id, result')
        .eq('match_id', match.id);

      if (!participants || participants.length === 0) {
        return {
          id: match.id,
          tournament_id: match.tournament_id,
          round_number: null,
          game_type: match.game_type,
          created_at: match.created_at,
          participants: [],
        };
      }

      const playerIds = participants.map((p) => p.player_id);
      const { data: players } = await supabase
        .from('players')
        .select('id, name, nickname')
        .in('id', playerIds);

      const playersMap = new Map(players?.map((p) => [p.id, p]) || []);

      return {
        id: match.id,
        tournament_id: match.tournament_id,
        round_number: null, // Simplified for feed
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
      {/* User Header */}
      <div className="sticky top-0 z-10">
        <UserHeader
          userName={currentUser.name}
          userNickname={currentUser.nickname}
          userColor={currentUser.color}
          userAvatarUrl={currentUser.avatar_url}
        />
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-slate-100 mb-2">{event?.name || 'Event Dashboard'}</h1>
            <p className="text-slate-400 text-sm">ProxyCon 2025</p>
          </div>
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
        
        <QuickActions eventId={eventId} />
        
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
          <div className="space-y-4">
             <h2 className="text-2xl font-bold text-slate-100">Active Tournaments</h2>
             <ActiveTournament
                tournament={null}
                currentMatch={null}
                currentUserId={currentUserId}
              />
          </div>
        )}
        
        <Feed matches={formattedMatches} />
      </div>
    </main>
  );
}