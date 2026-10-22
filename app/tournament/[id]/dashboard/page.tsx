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
import { matchPlayerKey, rosterKey, seatName } from '@/lib/activity';

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
    .select('id, profile_id, draft_seat')
    .eq('tournament_id', tournamentId)
    .eq('dropped', false);

  const profileIds = (participants || []).map((p) => rosterKey(p));

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
    .select('id, match_id, profile_id, participant_id, seat_number, result, games_won')
    .in('match_id', matchIds);

  // Normalize participants. Open seats use the participant id as their standings key.
  const normalizedParticipants: MatchParticipant[] = (allParticipants || []).map((p: any) => ({
    id: p.id,
    match_id: p.match_id,
    profile_id: matchPlayerKey(p),
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
        parts.map(p => ({ playerId: p.profile_id, result: p.result, gamesWon: p.games_won || 0 }))
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
  const realIds = (participants || []).map((p) => p.profile_id).filter((value): value is string => Boolean(value));
  const { data: profiles } = realIds.length
    ? await supabase.from('profiles').select('id, username, display_name').in('id', realIds)
    : { data: [] as { id: string; username: string | null; display_name: string | null }[] };
  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const boardProfiles: Profile[] = (participants || []).map((person) => {
    const profile = person.profile_id ? profileById.get(person.profile_id) : undefined;
    return {
      id: rosterKey(person),
      username: profile?.username || '',
      display_name: seatName(person.draft_seat, profile?.display_name || profile?.username),
    };
  });

  const initialData = {
    tournament: tournament as Tournament,
    matches: currentMatches as Match[],
    participants: normalizedParticipants,
    profiles: boardProfiles,
  };

  return (
    <BigScreenDashboard 
      tournamentId={tournamentId} 
      initialData={initialData}
      serverStandings={serverStandings}
    />
  );
}