import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import MatchReportingForm from '@/components/tournament/match-reporting-form';

interface PageProps {
  params: Promise<{ id: string; matchId: string }>;
}

export default async function MatchReportingPage({ params }: PageProps) {
  const { id: tournamentId, matchId } = await params;
  const supabase = await createClient();

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
      <main className="min-h-screen bg-slate-950 p-4 pb-24">
        <div className="max-w-2xl mx-auto">
          <p className="text-slate-400">This match has already been reported.</p>
        </div>
      </main>
    );
  }

  // Fetch player details
  const playerIds = participants.map((p) => p.player_id);
  const { data: players } = await supabase
    .from('players')
    .select('id, name, nickname')
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
      <main className="min-h-screen bg-slate-950 p-4 pb-24">
        <div className="max-w-2xl mx-auto">
          <p className="text-slate-400">This is a bye match and has already been recorded.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold text-slate-100">Who Won?</h1>
        <MatchReportingForm
          tournamentId={tournamentId}
          matchId={matchId}
          participants={matchParticipants}
        />
      </div>
    </main>
  );
}

