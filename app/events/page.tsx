import { createClient } from '@/utils/supabase/server';
import { getCurrentUser } from '@/lib/get-current-user';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import PageHeader from '@/components/ui/page-header';

export default async function EventsPage() {
  const supabase = await createClient();
  
  // Auth Check
  const authData = await getCurrentUser();
  if (!authData || !authData.user) {
    redirect('/login');
  }

  const { user } = authData;

  // Fetch Events for User
  // event_participants -> events
  const { data: participations } = await supabase
    .from('event_participants')
    .select('event_id, role, events(*)')
    .eq('profile_id', user.id);

  const myEvents = participations?.map(p => ({
    ...p.events,
    role: p.role
  })) || [];

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title="Events"
        subtitle="Your Active Events"
        backHref="/"
        backLabel="Home"
      />

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="grid gap-4">
          {myEvents.map((event: any) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <Card className="bg-slate-900 border-slate-800 hover:border-yellow-500/50 transition-colors cursor-pointer group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl font-bold text-slate-100 group-hover:text-yellow-500 transition-colors">
                    {event.name}
                  </CardTitle>
                  <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-yellow-500 transition-colors" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-slate-400 gap-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {event.start_date ? new Date(event.start_date).toLocaleDateString() : 'No date'}
                      </span>
                    </div>
                    <div className="px-2 py-0.5 rounded-full bg-slate-800 text-xs font-medium uppercase">
                      {event.role}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {myEvents.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-lg">
              <p className="text-slate-400 mb-4">You haven't joined any events yet.</p>
              <Button asChild className="bg-yellow-500 hover:bg-yellow-600 text-black">
                <Link href="/events/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Event
                </Link>
              </Button>
            </div>
          )}
        </div>

        {myEvents.length > 0 && (
          <div className="flex justify-center mt-8">
             <Button asChild variant="outline" className="border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800">
                <Link href="/events/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Event
                </Link>
              </Button>
          </div>
        )}
      </div>
    </main>
  );
}
