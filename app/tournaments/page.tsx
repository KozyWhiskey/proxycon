import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/ui/page-header';
import TournamentManagementList from '@/components/tournament/tournament-management-list';

export default async function TournamentsPage() {
  const supabase = await createClient();

  // Fetch all tournaments
  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select('id, name, format, status, created_at, max_rounds')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 pb-24">
        <PageHeader
          title="Tournament Management"
          subtitle="Manage your tournaments"
          backHref="/"
          backLabel="Dashboard"
        />
        <div className="max-w-2xl mx-auto p-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <p className="text-slate-400">Error loading tournaments. Please try again later.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // Group tournaments by status
  const pendingTournaments = tournaments?.filter((t) => t.status === 'pending') || [];
  const activeTournaments = tournaments?.filter((t) => t.status === 'active') || [];
  const completedTournaments = tournaments?.filter((t) => t.status === 'completed') || [];

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title="Tournament Management"
        subtitle="View and manage all tournaments"
        backHref="/"
        backLabel="Dashboard"
      />
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <TournamentManagementList
          pendingTournaments={pendingTournaments}
          activeTournaments={activeTournaments}
          completedTournaments={completedTournaments}
        />
      </div>
    </main>
  );
}

