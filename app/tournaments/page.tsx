import { createClient } from '@/utils/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/ui/page-header';
import TournamentManagementList from '@/components/tournament/tournament-management-list';
import { getCurrentUser } from '@/lib/get-current-user';
import { redirect } from 'next/navigation';
import {
  calculateStandings,
  sortStandings,
  convertDbMatchToMatchResult,
  type MatchResult,
} from '@/lib/swiss-pairing';

interface TournamentWithStandings {
  id: string;
  name: string;
  format: string;
  status: string;
  created_at: string;
  max_rounds: number | null;
  playerCount: number;
  currentRound: number | null;
  topStandings: Array<{
    rank: number;
    playerName: string;
    points: number;
    record: string;
  }>;
}

async function fetchTournamentStandings(tournamentId: string): Promise<{
  playerCount: number;
  currentRound: number | null;
  topStandings: Array<{
    rank: number;
    playerName: string;
    points: number;
    record: string;
  }>;
}> {
  const supabase = await createClient();

  // Get tournament participants
  const { data: participants } = await supabase
    .from('tournament_participants')
    .select('player_id')
    .eq('tournament_id', tournamentId);

  const playerIds = participants?.map((p) => p.player_id) || [];
  const playerCount = playerIds.length;

  // Fetch all matches
  const { data: matches } = await supabase
    .from('matches')
    .select('id, round_number')
    .eq('tournament_id', tournamentId)
    .order('round_number', { ascending: true });

  const currentRound = matches && matches.length > 0
    ? Math.max(...matches.map((m) => m.round_number || 1))
    : null;

  // If no matches, return empty standings
  if (!matches || matches.length === 0) {
    return {
      playerCount,
      currentRound: null,
      topStandings: [],
    };
  }

  // Fetch all match participants
  const matchIds = matches.map((m) => m.id);
  const { data: allParticipants } = await supabase
    .from('match_participants')
    .select('match_id, player_id, result')
    .in('match_id', matchIds);

  // Build match history for standings calculation
  const participantsByMatch = new Map<string, Array<{ playerId: string; result: 'win' | 'loss' | 'draw' | null }>>();
  allParticipants?.forEach((p) => {
    if (!participantsByMatch.has(p.match_id)) {
      participantsByMatch.set(p.match_id, []);
    }
    participantsByMatch.get(p.match_id)!.push({
      playerId: p.player_id,
      result: p.result as 'win' | 'loss' | 'draw' | null,
    });
  });

  // Convert to MatchResult format
  const matchHistory: MatchResult[] = [];
  for (const match of matches) {
    const matchParticipants = participantsByMatch.get(match.id) || [];
    if (matchParticipants.length > 0) {
      matchHistory.push(
        convertDbMatchToMatchResult(
          match.id,
          match.round_number || 1,
          matchParticipants.map((p) => ({ playerId: p.playerId, result: p.result }))
        )
      );
    }
  }

  // Calculate standings
  const standingsMap = calculateStandings(playerIds, matchHistory);
  const sortedStandings = sortStandings(Array.from(standingsMap.values()));

  // Fetch player details
  const { data: players } = await supabase
    .from('players')
    .select('id, name, nickname')
    .in('id', playerIds);

  const playersMap = new Map(players?.map((p) => [p.id, p]) || []);

  // Get top 3 standings
  const topStandings = sortedStandings.slice(0, 3).map((standing, index) => {
    const player = playersMap.get(standing.playerId);
    return {
      rank: index + 1,
      playerName: player?.nickname || player?.name || 'Unknown',
      points: standing.points,
      record: `${standing.matchWins}-${standing.matchLosses}-${standing.matchDraws}`,
    };
  });

  return {
    playerCount,
    currentRound,
    topStandings,
  };
}

export default async function TournamentsPage() {
  const supabase = await createClient();
  const authData = await getCurrentUser();

  if (!authData || !authData.user) {
    redirect('/login');
  }

  // Get user's events
  const { data: userEvents } = await supabase
    .from('event_participants')
    .select('event_id')
    .eq('profile_id', authData.user.id);

  const eventIds = userEvents?.map(e => e.event_id) || [];

  // Get linked player for legacy tournament support
  const { data: linkedPlayer } = await supabase
    .from('players')
    .select('id')
    .eq('profile_id', authData.user.id)
    .single();

  let directTournamentIds: string[] = [];
  if (linkedPlayer) {
    const { data: participations } = await supabase
      .from('tournament_participants')
      .select('tournament_id')
      .eq('player_id', linkedPlayer.id);
    directTournamentIds = participations?.map(p => p.tournament_id) || [];
  }

  // If no events AND no direct tournaments, show empty state
  if (eventIds.length === 0 && directTournamentIds.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950 pb-24">
        <PageHeader
          title="Tournaments"
          subtitle="View and manage tournaments"
          backHref="/"
          backLabel="Home"
        />
        <div className="max-w-2xl mx-auto p-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6 text-center">
              <p className="text-slate-400 mb-2">You haven't joined any events or tournaments yet.</p>
              <p className="text-sm text-slate-500">Join an event to see tournaments.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // Fetch tournaments matching EITHER:
  // 1. Belonging to an event the user is in (eventIds)
  // 2. The user is a direct participant in (directTournamentIds) - for legacy/mixed support
  let query = supabase
    .from('tournaments')
    .select('id, name, format, status, created_at, max_rounds')
    .order('created_at', { ascending: false });

  const conditions: string[] = [];
  if (eventIds.length > 0) {
    conditions.push(`event_id.in.(${eventIds.join(',')})`);
  }
  if (directTournamentIds.length > 0) {
    conditions.push(`id.in.(${directTournamentIds.join(',')})`);
  }

  if (conditions.length > 0) {
    query = query.or(conditions.join(','));
  }

  const { data: tournaments, error } = await query;

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 pb-24">
        <PageHeader
          title="Tournaments"
          subtitle="View and manage tournaments"
          backHref="/"
          backLabel="Home"
        />
        <div className="max-w-2xl mx-auto p-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <p className="text-slate-400">Error loading tournaments. Please try again later.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // Fetch standings for all tournaments
  const tournamentsWithStandings: TournamentWithStandings[] = await Promise.all(
    (tournaments || []).map(async (tournament) => {
      const standings = await fetchTournamentStandings(tournament.id);
      return {
        ...tournament,
        ...standings,
      };
    })
  );

  // Group tournaments by status
  const pendingTournaments = tournamentsWithStandings.filter((t) => t.status === 'pending');
  const activeTournaments = tournamentsWithStandings.filter((t) => t.status === 'active');
  const completedTournaments = tournamentsWithStandings.filter((t) => t.status === 'completed');

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title="Tournaments"
        subtitle="Your Event Tournaments"
        backHref="/"
        backLabel="Home"
      />
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <TournamentManagementList
          pendingTournaments={pendingTournaments}
          activeTournaments={activeTournaments}
          completedTournaments={completedTournaments}
        />
      </div>
    </main>
  );
}