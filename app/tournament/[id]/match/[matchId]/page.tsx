import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import MatchReportingForm from '@/components/tournament/match-reporting-form';
import PageHeader from '@/components/ui/page-header';
import { getCurrentUser } from '@/lib/get-current-user'; // Import getCurrentUser
import { getUsersDecks } from '@/app/decks/actions'; // Import getUsersDecks

interface PageProps {
  params: Promise<{ id: string; matchId: string }>;
}

export default async function MatchReportingPage({ params }: PageProps) {
  const { id: tournamentId, matchId } = await params;
  const supabase = await createClient();

  // Get current user and their decks
  const authData = await getCurrentUser();
  if (!authData || !authData.user) {
    // This case should be handled by middleware redirecting to login
    notFound(); 
  }
  const { user } = authData;
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
    .select('id, player_id, result')
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

  // Fetch player details
  const playerIds = participants.map((p) => p.player_id);
  const { data: players } = await supabase
    .from('players')
    .select('id, name, nickname, profile_id') // Include profile_id to identify logged-in user's player record
    .in('id', playerIds);

  const playersMap = new Map(players?.map((p) => [p.id, p]) || []);

  const matchParticipants = participants.map((p) => ({
    id: p.id,
    player_id: p.player_id,
    result: p.result,
    player: playersMap.get(p.player_id),
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
  const player1Name = matchParticipants[0]?.player?.nickname || matchParticipants[0]?.player?.name || 'Player 1';
  const player2Name = matchParticipants[1]?.player?.nickname || matchParticipants[1]?.player?.name || 'Player 2';

  // Determine which participant is the current user (if any)
  const player1IsCurrentUser = matchParticipants[0]?.player?.profile_id === user.id;
  const player2IsCurrentUser = matchParticipants[1]?.player?.profile_id === user.id;


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
          player1ProfileId={player1IsCurrentUser ? user.id : undefined} // Pass user's Auth ID if this player is the user
          player2ProfileId={player2IsCurrentUser ? user.id : undefined}
        />
      </div>
    </main>
  );
}