import { createClient } from '@/utils/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/ui/page-header';
import TournamentManagementList from '@/components/tournament/tournament-management-list';
import { requireProfile } from '@/lib/get-current-user';
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
    .select('profile_id')
    .eq('tournament_id', tournamentId);

  const profileIds = participants?.map((p) => p.profile_id) || [];
  const playerCount = profileIds.length;

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
    .select('match_id, profile_id, result')
    .in('match_id', matchIds);

  // Build match history for standings calculation
  const participantsByMatch = new Map<string, Array<{ profileId: string; result: 'win' | 'loss' | 'draw' | null }>>();
  allParticipants?.forEach((p) => {
    if (!participantsByMatch.has(p.match_id)) {
      participantsByMatch.set(p.match_id, []);
    }
    participantsByMatch.get(p.match_id)!.push({
      profileId: p.profile_id,
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
          matchParticipants.map((p) => ({ playerId: p.profileId, result: p.result }))
        )
      );
    }
  }

  // Calculate standings
  const standingsMap = calculateStandings(profileIds, matchHistory);
  const sortedStandings = sortStandings(Array.from(standingsMap.values()));

  // Fetch profile details
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .in('id', profileIds);

  const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  // Get top 3 standings
  const topStandings = sortedStandings.slice(0, 3).map((standing, index) => {
    const profile = profilesMap.get(standing.playerId);
    return {
      rank: index + 1,
      playerName: profile?.display_name || profile?.username || 'Unknown',
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
  const { user } = await requireProfile();

  // Get user's events
  const { data: userEvents } = await supabase
    .from('event_participants')
    .select('event_id')
    .eq('profile_id', user.id);

  const eventIds = userEvents?.map(e => e.event_id) || [];

  // If no events, show empty state
  if (eventIds.length === 0) {
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
              <p className="text-slate-400 mb-2">You haven't joined any events yet.</p>
              <p className="text-sm text-slate-500">Join an event to see tournaments.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // Fetch tournaments belonging to events the user is in
  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select('id, name, format, status, created_at, max_rounds')
    .in('event_id', eventIds)
    .order('created_at', { ascending: false });

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