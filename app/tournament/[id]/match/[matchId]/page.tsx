import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import MatchReportingForm from '@/components/tournament/match-reporting-form';
import PageHeader from '@/components/ui/page-header';
import { requireProfile } from '@/lib/get-current-user'; // Import requireProfile
import { getUsersDecks } from '@/app/decks/actions'; // Import getUsersDecks

interface PageProps {
  params: Promise<{ id: string; matchId: string }>;
}

export default async function MatchReportingPage({ params }: PageProps) {
  const { id: tournamentId, matchId } = await params;
  const supabase = await createClient();

  // Get current user and their decks
  const { user } = await requireProfile();
  const { decks, error: decksError } = await getUsersDecks(); // Fetch decks for the current user

  if (decksError) {
    console.error('Error fetching user decks:', decksError);
    // Optionally display an error message or handle gracefully
  }

  // Fetch match details
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('id, round_number, game_type, tournament_id')
    .eq('id', matchId)
    .single();

  if (matchError || !match || match.tournament_id !== tournamentId) {
    notFound();
  }

  // Fetch participants
  const { data: participants } = await supabase
    .from('match_participants')
    .select('id, profile_id, result')
    .eq('match_id', matchId);

  if (!participants || participants.length === 0) {
    notFound();
  }

  // Check if match is already completed
  const isCompleted = participants.some((p) => p.result !== null);
  if (isCompleted) {
    // Match already has a result, redirect back to tournament
    return (
      <main className="min-h-screen bg-slate-950 pb-24">
        <PageHeader
          title="Match Already Reported"
          subtitle="This match result has already been submitted"
          backHref={`/tournament/${tournamentId}`}
          backLabel="Tournament"
        />
        <div className="max-w-2xl mx-auto p-4">
          <p className="text-slate-400">This match has already been reported.</p>
        </div>
      </main>
    );
  }

  // Fetch profile details
  const profileIds = participants.map((p) => p.profile_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .in('id', profileIds);

  const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  const matchParticipants = participants.map((p) => ({
    id: p.id,
    profile_id: p.profile_id,
    result: p.result,
    profile: profilesMap.get(p.profile_id),
  }));

  // Handle bye (single participant)
  if (matchParticipants.length === 1) {
    return (
      <main className="min-h-screen bg-slate-950 pb-24">
        <PageHeader
          title="Bye Match"
          subtitle="This match is a bye and has already been recorded"
          backHref={`/tournament/${tournamentId}`}
          backLabel="Tournament"
        />
        <div className="max-w-2xl mx-auto p-4">
          <p className="text-slate-400">This is a bye match and has already been recorded.</p>
        </div>
      </main>
    );
  }

  // Get player names for subtitle
  const player1Name = matchParticipants[0]?.profile?.display_name || matchParticipants[0]?.profile?.username || 'Player 1';
  const player2Name = matchParticipants[1]?.profile?.display_name || matchParticipants[1]?.profile?.username || 'Player 2';

  // Determine which participant is the current user (if any)
  const player1IsCurrentUser = matchParticipants[0]?.profile_id === user.id;
  const player2IsCurrentUser = matchParticipants[1]?.profile_id === user.id;

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title="Who Won?"
        subtitle={`${player1Name} vs ${player2Name}`}
        backHref={`/tournament/${tournamentId}`}
        backLabel="Tournament"
      />
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <MatchReportingForm
          tournamentId={tournamentId}
          matchId={matchId}
          participants={matchParticipants}
          userDecks={decks || []} // Pass fetched decks
          player1ProfileId={player1IsCurrentUser ? user.id : undefined} 
          player2ProfileId={player2IsCurrentUser ? user.id : undefined}
        />
      </div>
    </main>
  );
}