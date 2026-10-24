import Link from 'next/link';
import { getCurrentUser } from '@/lib/get-current-user';
import { redirect } from 'next/navigation';
import UserManager from '@/components/admin/user-manager';
import EventManager from '@/components/admin/event-manager';
import { GuestManager, type AdminGuestInvitation } from '@/components/admin/guest-manager';
import { createClient } from '@/utils/supabase/server';
import type { Profile } from '@/lib/types';
import { houseOrigin } from '@/lib/house-url';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageIntro } from '@/components/layout/page-intro';

type AdminProfile = Pick<Profile, 'id' | 'display_name' | 'username' | 'avatar_url' | 'role'>;

export default async function AdminPage() {
  const current = await getCurrentUser();
  if (!current) redirect('/login');
  if (!current?.isAdmin) redirect('/');
  const db = await createClient();
  const [{ data: events }, { data: invitations, error: guestError }, { data: profiles }, { data: guestProfiles }] =
    await Promise.all([
      db
        .from('events')
        .select('id,name,slug,is_active,start_date')
        .order('start_date', { ascending: false }),
      db
        .from('weekend_guest_invitations')
        .select('id,event_id,expires_at,spots:weekend_guest_spots(id,display_name,profile_id)')
        .returns<AdminGuestInvitation[]>(),
      db
        .from('profiles')
        .select('id,display_name,username,avatar_url,role')
        .order('display_name')
        .returns<AdminProfile[]>(),
      db.from('weekend_guest_spots').select('profile_id').not('profile_id', 'is', null),
    ]);
  const guestProfileIds = (guestProfiles || []).flatMap((spot) =>
    spot.profile_id ? [String(spot.profile_id)] : [],
  );
  return (
    <main className="page collection-page admin-collection">
      <PageIntro
        compact
        eyebrow="ADMINISTRATION"
        title="Admin tools"
        description="Players, guests, events, and result corrections."
      />
      <Tabs defaultValue="users">
        <div className="overflow-x-auto mb-6">
          <TabsList>
            <TabsTrigger value="users">Players</TabsTrigger>
            <TabsTrigger value="guests">Weekend guests</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="users">
          <div className="overflow-x-auto">
            <UserManager
              users={(profiles || []) as Profile[]}
              guestProfileIds={guestProfileIds}
              currentUserId={current.profile?.id || current.user.id}
            />
          </div>
        </TabsContent>
        <TabsContent value="guests">
          <GuestManager
            events={(events || []).filter((event) => event.is_active)}
            invitations={invitations || []}
            ready={!guestError}
            houseOrigin={houseOrigin()}
            profileNames={(profiles || []).flatMap((profile) =>
              profile.display_name ? [profile.display_name] : [],
            )}
          />
        </TabsContent>
        <TabsContent value="events">
          <div className="overflow-x-auto">
            <EventManager initialEvents={events || []} />
          </div>
        </TabsContent>
        <TabsContent value="results">
          <section className="panel">
            <h2 className="text-2xl">Correct a result</h2>
            <p className="subtle mt-2 mb-5">
              Open an event to find games by player and tournament. Join that event to replace results
              using its scoring controls.
            </p>
            {(events || []).map((event) => (
              <Link key={event.id} href={`/events/${event.id}/manage`} className="game-row">
                <strong>{event.name}</strong>
                <span className="text-link">Manage results →</span>
              </Link>
            ))}
            {!events?.length && <p className="subtle">Create an event to start recording games.</p>}
          </section>
        </TabsContent>
      </Tabs>
    </main>
  );
}
