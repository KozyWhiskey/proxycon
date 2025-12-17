import { createClient } from '@/utils/supabase/server';
import { getCurrentUser } from '@/lib/get-current-user';
import { getUsersDecks } from '@/app/decks/actions';
import { redirect } from 'next/navigation';
import CasualGameForm from '@/components/casual/casual-game-form';
import PageHeader from '@/components/ui/page-header';

interface PageProps {
  searchParams: Promise<{ eventId?: string }>;
}

export default async function CasualPlayPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const authData = await getCurrentUser();
  const { eventId } = await searchParams;

  if (!authData || !authData.user) {
    redirect('/login');
  }

  // Fetch all players for selection
  // In V2, we might want to filter this by "Event" or show all.
  // For Casual, global list of players is fine, or friends.
  // Let's stick to global list of players for now.
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, name, nickname, avatar_url, color, created_at, updated_at, wins') // Ensure all required fields for Player type
    .order('name', { ascending: true });

  if (playersError) {
    console.error('Error fetching players:', playersError);
    // Handle error gracefully?
  }

  // Fetch current user's decks
  const { decks, error: decksError } = await getUsersDecks();

  if (decksError) {
    console.error('Error fetching decks:', decksError);
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title="Casual Play"
        subtitle="Log games outside of tournaments"
        backHref={eventId ? `/events/${eventId}` : "/"}
        backLabel={eventId ? "Event Dashboard" : "Home"}
      />

      <div className="max-w-2xl mx-auto p-4">
        <CasualGameForm 
          players={players || []} 
          userDecks={decks || []} 
          eventId={eventId}
        />
      </div>
    </main>
  );
}