import { createClient } from '@/utils/supabase/server';
import { getCurrentUser } from '@/lib/get-current-user';
import { redirect } from 'next/navigation';
import ClaimProfile from '@/components/dashboard/claim-profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar } from 'lucide-react';
import Link from 'next/link';
import UserHeader from '@/components/dashboard/user-header';
import QuickActions from '@/components/dashboard/quick-actions';

export default async function Home() {
  const supabase = await createClient();
  
  // Auth Check
  const authData = await getCurrentUser();
  if (!authData || !authData.user) {
    redirect('/login');
  }

  const { user, profile } = authData;

  // Check for linked player record
  const { data: linkedPlayer } = await supabase
    .from('players')
    .select('*')
    .eq('profile_id', user.id)
    .single();

  if (!linkedPlayer) {
    const { data: unclaimedPlayers } = await supabase
      .from('players')
      .select('id, name, avatar_url')
      .is('profile_id', null)
      .order('name');

    return (
      <main className="min-h-screen bg-slate-950 p-4">
        <div className="max-w-4xl mx-auto space-y-8 mt-12">
           <div className="text-center">
             <h1 className="text-3xl font-bold text-slate-100 mb-2">Welcome, {profile?.username || 'Player'}</h1>
             <p className="text-slate-400">Please link your legacy profile to continue.</p>
           </div>
           <ClaimProfile players={unclaimedPlayers || []} />
        </div>
      </main>
    );
  }

  // Get next active event (if any) to show a quick link
  const { data: activeEventParticipation } = await supabase
    .from('event_participants')
    .select('event_id, events(id, name, start_date)')
    .eq('profile_id', user.id)
    .eq('events.is_active', true)
    .limit(1)
    .maybeSingle();

  const eventsData = activeEventParticipation?.events;
  const activeEvent = Array.isArray(eventsData) ? eventsData[0] : eventsData;

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      {/* User Header */}
      <div className="sticky top-0 z-10">
        <UserHeader
          userName={linkedPlayer.name}
          userNickname={linkedPlayer.nickname}
          userColor={linkedPlayer.color}
          userAvatarUrl={linkedPlayer.avatar_url}
        />
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        
        {/* Status Card */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <Trophy className="w-8 h-8 text-yellow-500 mb-2" />
              <div className="text-3xl font-bold text-slate-100">{linkedPlayer.wins || 0}</div>
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