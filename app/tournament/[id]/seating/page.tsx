import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import PageHeader from '@/components/ui/page-header';
import DraftSeatingSelector from '@/components/tournament/draft-seating-selector';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DraftSeatingPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch tournament
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select('id, name, format, status')
    .eq('id', id)
    .single();

  if (tournamentError || !tournament) {
    notFound();
  }

  // Check if tournament already has matches (draft already started)
  const { data: existingMatches } = await supabase
    .from('matches')
    .select('id')
    .eq('tournament_id', id)
    .limit(1);

  if (existingMatches && existingMatches.length > 0) {
    // Draft already started, redirect to tournament page
    redirect(`/tournament/${id}`);
  }

  // Fetch tournament participants
  const { data: participants, error: participantsError } = await supabase
    .from('tournament_participants')
    .select('id, player_id, draft_seat')
    .eq('tournament_id', id)
    .order('draft_seat', { ascending: true, nullsFirst: false });

  if (participantsError || !participants) {
    notFound();
  }

  // Fetch player details
  const playerIds = participants.map((p) => p.player_id);
  const { data: players } = await supabase
    .from('players')
    .select('id, name, nickname')
    .in('id', playerIds);

  const playersMap = new Map(players?.map((p) => [p.id, p]) || []);

  // Combine participants with player data
  const participantsWithPlayers = participants.map((p) => ({
    ...p,
    players: playersMap.get(p.player_id) || null,
  }));

  const numPlayers = participantsWithPlayers.length;
  const participantsWithSeats = participantsWithPlayers.filter((p) => p.draft_seat !== null);
  const allSeatsAssigned = participantsWithSeats.length === numPlayers;

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title="Draft Seating"
        subtitle={`${tournament.name} • ${numPlayers} players`}
        backHref="/"
        backLabel="Dashboard"
      />
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <DraftSeatingSelector
          tournamentId={id}
          participants={participantsWithPlayers}
          numPlayers={numPlayers}
          allSeatsAssigned={allSeatsAssigned}
        />
      </div>
    </main>
  );
}

