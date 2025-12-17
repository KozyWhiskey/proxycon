import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import TournamentSetupForm from '@/components/tournament/tournament-setup-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/ui/page-header';

interface PageProps {
  searchParams: Promise<{ eventId?: string }>;
}

export default async function NewTournamentPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { eventId } = await searchParams;

  // Fetch all players
  const { data: players, error } = await supabase
    .from('players')
    .select('id, name, nickname')
    .order('name', { ascending: true });

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

  if (!players || players.length < 2) {
    return (
      <main className="min-h-screen bg-slate-950 p-4">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100">Not Enough Players</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">
                You need at least 2 players to create a tournament. Please add more players first.
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
        <TournamentSetupForm players={players} eventId={eventId} />
      </div>
    </main>
  );
}