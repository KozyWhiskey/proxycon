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

  // Ensure profile is complete (V3 Onboarding)
  if (!authData.profile || !authData.profile.username || !authData.profile.display_name) {
    redirect('/onboarding');
  }

  // Fetch all profiles for selection (V3)
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, favorite_card_image, created_at, updated_at') // Select V3 profile fields
    .order('display_name', { ascending: true }); // Order by display_name

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    // Handle error gracefully
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
          players={profiles || []} // Pass profiles
          userDecks={decks || []} 
          eventId={eventId}
        />
      </div>
    </main>
  );
}
