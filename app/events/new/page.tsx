import { createClient } from '@/utils/supabase/server';
import { requireProfile } from '@/lib/get-current-user';
import { getUserGuilds } from '@/app/guilds/actions';
import NewEventForm from '@/components/events/new-event-form';
import PageHeader from '@/components/ui/page-header';

interface PageProps {
  searchParams: Promise<{
    guildId?: string;
  }>;
}

export default async function NewEventPage({ searchParams }: PageProps) {
  const { guildId } = await searchParams;
  const { user } = await requireProfile();
  
  // Fetch guilds the user is an admin/owner of (to allow creating events)
  const allGuilds = await getUserGuilds(user.id);
  const adminGuilds = allGuilds.filter(g => g.role === 'owner' || g.role === 'admin');

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title="Event Setup"
        subtitle="Create a tournament weekend"
        backHref="/events"
        backLabel="Events"
      />

      <div className="max-w-3xl mx-auto p-4 mt-4">
        <NewEventForm 
          guilds={adminGuilds} 
          defaultGuildId={guildId} 
        />
      </div>
    </main>
  );
}