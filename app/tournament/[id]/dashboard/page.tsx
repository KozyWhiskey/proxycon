import { createClient } from '@supabase/supabase-js'; // Use direct client for public dashboard
import { notFound } from 'next/navigation';
import BigScreenDashboard, {
  Tournament,
  Match,
  MatchParticipant,
  Profile
} from './big-screen-dashboard';
import {
  calculateStandings,
  sortStandings,
  convertDbMatchToMatchResult,
  MatchResult
} from '@/lib/swiss-pairing';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TournamentDashboardPage({ params }: PageProps) {
  const { id: tournamentId } = await params;
  
  // Use direct client to ensure we can fetch data even without a user session (Public Dashboard)
  // This mirrors the logic that worked in the debug script.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch tournament
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, format, status, max_rounds, round_duration_minutes')
    .eq('id', tournamentId)
    .single();

  if (!tournament) {
    notFound();
  }

  // Fetch tournament participants
  const { data: participants } = await supabase
    .from('tournament_participants')
    .select('profile_id')
    .eq('tournament_id', tournamentId);

  const profileIds = participants?.map((p) => p.profile_id) || [];

  // Fetch all matches
  // SIMPLIFIED QUERY TO DEBUG FETCHING
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('id, round_number, tournament_id, started_at, paused_at, remaining_seconds') // Reduced columns
    .eq('tournament_id', tournamentId)
    .order('round_number', { ascending: true });

  if (matchesError) {
    console.error('[DashboardPage] Matches Fetch Error:', matchesError);
  }

  const currentMatches = matches || [];
  const matchIds = currentMatches.map(m => m.id);

  // Fetch all match participants using explicit match IDs
  const { data: allParticipants } = await supabase
    .from('match_participants')
    .select('id, match_id, profile_id, result, games_won')
    .in('match_id', matchIds);

  // Normalize participants
  const normalizedParticipants: MatchParticipant[] = (allParticipants || []).map((p: any) => ({
    id: p.id,
    match_id: p.match_id,
    profile_id: p.profile_id,
    result: p.result,
    games_won: p.games_won
  }));

  // Server-side calculation to verify data integrity
  const participantsByMatch = new Map<string, MatchParticipant[]>();
  normalizedParticipants.forEach(p => {
    if (!participantsByMatch.has(p.match_id)) participantsByMatch.set(p.match_id, []);
    participantsByMatch.get(p.match_id)!.push(p);
  });

  const matchHistory: MatchResult[] = [];
  currentMatches.forEach(match => {
    const parts = participantsByMatch.get(match.id) || [];
    if (parts.length > 0) {
      matchHistory.push(convertDbMatchToMatchResult(
        match.id, 
        match.round_number, 
        parts.map(p => ({ playerId: p.profile_id, result: p.result }))
      ));
    }
  });

  const standingsMap = calculateStandings(profileIds, matchHistory);
  const serverStandings = sortStandings(Array.from(standingsMap.values()));

  // DEBUG: Log server-side fetched data AND calculated stats
  console.log('[DashboardPage] Server Fetch:', {
    tournamentId,
    matchesCount: currentMatches.length,
    participantsCount: normalizedParticipants.length,
    profilesCount: profileIds.length,
    sampleMatchId: currentMatches[0]?.id,
    matchHistoryCount: matchHistory.length,
    firstPlacePoints: serverStandings[0]?.points,
    totalPoints: serverStandings.reduce((sum, s) => sum + s.points, 0)
  });

  // Fetch profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .in('id', profileIds);

  const initialData = {
    tournament: tournament as Tournament,
    matches: currentMatches as Match[],
    participants: normalizedParticipants,
    profiles: (profiles || []) as Profile[],
  };

  return (
    <BigScreenDashboard 
      tournamentId={tournamentId} 
      initialData={initialData}
      serverStandings={serverStandings}
    />
  );
}