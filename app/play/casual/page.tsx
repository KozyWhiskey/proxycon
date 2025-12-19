import { createClient } from '@/utils/supabase/server';
import { getCurrentUser } from '@/lib/get-current-user';
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

  let profiles: any[] = [];
  
  if (eventId) {
    // Fetch ONLY event members
    const { data: members, error } = await supabase
      .from('event_members')
      .select(`
        profile:profiles (
          id, username, display_name, avatar_url, bio, favorite_card_image, created_at, updated_at
        )
      `)
      .eq('event_id', eventId);
      
    if (error) {
      console.error('Error fetching event members:', error);
    } else {
      // Flatten the structure
      // @ts-ignore
      profiles = members.map(m => Array.isArray(m.profile) ? m.profile[0] : m.profile).filter(Boolean);
    }
  } else {
    // Global Mode: Fetch all profiles (limit to reasonable amount or implement search later)
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, favorite_card_image, created_at, updated_at')
      .order('display_name', { ascending: true })
      .limit(50); // Limit to 50 for now to prevent massive payloads

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    } else {
      profiles = allProfiles || [];
    }
  }

  // Fetch ALL decks to allow selecting decks for any player
  const { data: decks, error: decksError } = await supabase
    .from('decks')
    .select('*')
    .order('name', { ascending: true });

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

      <div className="max-w-3xl mx-auto p-4">
        <CasualGameForm 
          players={profiles || []} // Pass profiles
          allDecks={decks || []} 
          eventId={eventId}
        />
      </div>
    </main>
  );
}
