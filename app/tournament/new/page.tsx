import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import TournamentSetupForm from '@/components/tournament/tournament-setup-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/ui/page-header';
import { Profile } from '@/lib/types';

interface PageProps {
  searchParams: Promise<{ eventId?: string }>;
}

export default async function NewTournamentPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { eventId } = await searchParams;

  let players = [];
  let error = null;

  if (eventId) {
    // Fetch event members
    const { data: members, error: membersError } = await supabase
      .from('event_members')
      .select('profile_id, profiles(id, display_name, username)')
      .eq('event_id', eventId);
    
    if (membersError) error = membersError;
    
    // Ensure m.profiles is treated as a single Profile object or null
    players = members?.map(m => (m.profiles && Array.isArray(m.profiles) && m.profiles.length > 0) ? m.profiles[0] as Profile : null).filter((p): p is Profile => p !== null) || [];
  } else {
    // Fetch all profiles (Global)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, username')
      .order('display_name', { ascending: true });

    if (profilesError) error = profilesError;
    players = profiles || [];
  }

  // Map to format expected by form if needed (types match mostly)
  const mappedPlayers = players.map(p => ({
    id: p.id,
    display_name: p.display_name,
    username: p.username
  }));

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 p-4">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">Could not fetch players. Please try again later.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // Allow 1 player for testing? No, keep 2 for tournament logic.
  if (mappedPlayers.length < 2) {
    return (
      <main className="min-h-screen bg-slate-950 p-4">
        <div className="max-w-2xl mx-auto">
          <PageHeader
            title="New Tournament"
            backHref={eventId ? `/events/${eventId}` : '/'}
            backLabel="Back"
          />
          <Card className="bg-slate-900 border-slate-800 mt-6">
            <CardHeader>
              <CardTitle className="text-slate-100">Not Enough Players</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">
                You need at least 2 players to create a tournament. 
                {eventId ? " Invite players to this event first." : " Wait for others to create profiles."}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title="New Tournament"
        subtitle="Create a new tournament bracket"
        backHref={eventId ? `/events/${eventId}` : '/'}
        backLabel={eventId ? "Event Dashboard" : "Dashboard"}
      />
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <TournamentSetupForm players={mappedPlayers} eventId={eventId} />
      </div>
    </main>
  );
}
