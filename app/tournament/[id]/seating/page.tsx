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

  // Fetch tournament participants with profile info (V3)
  const { data: participants, error: participantsError } = await supabase
    .from('tournament_participants')
    .select('id, profile_id, draft_seat, profiles(id, display_name, username)')
    .eq('tournament_id', id)
    .order('draft_seat', { ascending: true, nullsFirst: false });

  if (participantsError || !participants) {
    notFound();
  }

  // Map to structure expected by client component
  // We map 'profiles' to the expected 'players' shape for minimal frontend churn,
  // or update the frontend component types. Let's update frontend types.
  const participantsWithProfiles = participants.map(p => ({
    id: p.id,
    profile_id: p.profile_id,
    draft_seat: p.draft_seat,
    profile: (p.profiles && !Array.isArray(p.profiles)) ? p.profiles : null // Ensure it's a single object or null
  }));

  const numPlayers = participantsWithProfiles.length;
  const participantsWithSeats = participantsWithProfiles.filter((p) => p.draft_seat !== null);
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
          participants={participantsWithProfiles}
          numPlayers={numPlayers}
          allSeatsAssigned={allSeatsAssigned}
        />
      </div>
    </main>
  );
}