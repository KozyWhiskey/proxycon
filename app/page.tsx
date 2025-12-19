import { createClient } from '@/utils/supabase/server';
import { requireProfile } from '@/lib/get-current-user';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy } from 'lucide-react';
import Link from 'next/link';
import UserHeader from '@/components/dashboard/user-header';
import QuickActions from '@/components/dashboard/quick-actions';

export default async function Home() {
  const supabase = await createClient();
  
  // Auth & Profile Check
  const { user, profile } = await requireProfile();

  // Calculate total wins (V3: count match_participants where result = 'win')
  // This is expensive at scale, but fine for now. V3 suggests storing this in event_members,
  // but for a global stat we'd need a rollup or just a count query.
  const { count: totalWins } = await supabase
    .from('match_participants')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', user.id)
    .eq('result', 'win');

  // Get next active event (if any) to show a quick link
  const { data: activeEventMember } = await supabase
    .from('event_members')
    .select('event_id, events(id, name, start_date)')
    .eq('profile_id', user.id)
    .eq('events.is_active', true)
    .limit(1)
    .maybeSingle();

  // TypeScript workaround because Supabase types might be inferred deeply
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeEvent = (activeEventMember as any)?.events;

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      {/* User Header */}
      <div className="sticky top-0 z-10">
        <UserHeader
          displayName={profile.display_name || 'Player'}
          username={profile.username}
          avatarUrl={profile.avatar_url}
        />
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        
        {/* Status Card */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <Trophy className="w-8 h-8 text-yellow-500 mb-2" />
              <div className="text-3xl font-bold text-slate-100">{totalWins || 0}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">Total Wins</div>
            </CardContent>
          </Card>
           
           {/* Placeholder for Rank or other global stat */}
           <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <div className="text-3xl font-bold text-slate-100">-</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">Global Rank</div>
            </CardContent>
          </Card>
        </div>

        {/* Active Event Banner (if exists) */}
        {activeEvent && (
          <div className="bg-gradient-to-r from-yellow-500/10 to-transparent p-4 rounded-lg border border-yellow-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-yellow-500 uppercase font-bold mb-1">Happening Now</p>
                <h3 className="text-lg font-bold text-slate-100">{activeEvent.name}</h3>
              </div>
              <Button asChild size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-slate-950">
                <Link href={`/events/${activeEvent.id}`}>
                  View Event
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <QuickActions />

        {/* Recent Activity / Feed Placeholder */}
        <div>
          <h2 className="text-lg font-semibold text-slate-100 mb-3">Recent Activity</h2>
          <Card className="bg-slate-900 border-slate-800 opacity-50">
            <CardContent className="p-6 text-center">
              <p className="text-slate-500">No recent activity to show.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
