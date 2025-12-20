import { createClient } from '@/utils/supabase/server';
import { requireProfile } from '@/lib/get-current-user';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import PageHeader from '@/components/ui/page-header';
import JoinEventDialog from '@/components/events/join-event-dialog';

export default async function EventsPage() {
  const supabase = await createClient();
  
  // Auth & Profile Check
  const { user } = await requireProfile();

  // Fetch Events for User
  // event_members -> events
  const { data: participations } = await supabase
    .from('event_members')
    .select(`
      event_id,
      role,
      events (
        id,
        name,
        start_date,
        end_date,
        members:event_members (
          profile:profiles (
            id,
            avatar_url,
            display_name
          )
        )
      )
    `)
    .eq('profile_id', user.id);

  const myEvents = participations?.map((p: any) => {
    // Process members
    const rawMembers = p.events.members || [];
    const members = rawMembers.map((m: any) => Array.isArray(m.profile) ? m.profile[0] : m.profile).filter(Boolean);
    
    return {
      ...p.events,
      role: p.role,
      memberCount: members.length,
      topMembers: members.slice(0, 5) // Get first 5 for avatars
    };
  }) || [];

  return (
    <main className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Events"
        subtitle="Your Active Events"
        backHref="/"
        backLabel="Home"
        actions={
          <div className="flex gap-2">
            <JoinEventDialog />
            <Button asChild variant="default">
              <Link href="/events/new">
                <Plus className="w-4 h-4 mr-2" />
                New Event
              </Link>
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myEvents.map((event: any) => (
            <Link key={event.id} href={`/events/${event.id}`} className="group block h-full">
              <Card className="glass-panel h-full hover:border-primary/50 transition-all duration-300 overflow-hidden relative flex flex-col">
                {/* Decorative Gradient Top Bar */}
                <div className={`h-1 w-full ${
                  event.role === 'owner' ? 'bg-primary' : 
                  event.role === 'admin' ? 'bg-zinc-500' : 'bg-zinc-800'
                }`} />
                
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-3">
                     <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm border ${
                        event.role === 'owner' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-white/5 text-muted-foreground border-white/10'
                     }`}>
                        {event.role}
                     </span>
                     {event.start_date && (
                        <div className="flex items-center text-[10px] text-muted-foreground bg-white/5 border border-white/10 px-2 py-1 rounded-full uppercase tracking-wider font-mono">
                           <Calendar className="w-3 h-3 mr-1.5" />
                           {new Date(event.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                           {event.end_date && ` - ${new Date(event.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                        </div>
                     )}
                  </div>
                  <CardTitle className="text-xl font-bold text-foreground font-heading group-hover:text-primary transition-colors line-clamp-2">
                    {event.name}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="mt-2">
                     <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Players</span>
                        <span className="text-sm font-bold text-foreground">{event.memberCount}</span>
                     </div>
                     
                     {/* Avatar Stack */}
                     <div className="flex -space-x-3 items-center">
                        {event.topMembers.map((member: any, i: number) => (
                           <div key={member.id} className="relative z-10 hover:z-20 transition-all">
                              <div className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-zinc-800 overflow-hidden">
                                 {member.avatar_url ? (
                                    <img src={member.avatar_url} alt={member.display_name} className="w-full h-full object-cover" />
                                 ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground font-bold">
                                       {member.display_name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                 )}
                              </div>
                           </div>
                        ))}
                        {event.memberCount > 5 && (
                           <div className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center text-[10px] text-muted-foreground font-bold z-0">
                              +{event.memberCount - 5}
                           </div>
                        )}
                     </div>
                  </div>

                  <div className="mt-6 flex items-center text-primary text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 duration-300">
                     Enter Dashboard <ArrowRight className="w-3 h-3 ml-2" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Join New Event Card */}
          <div className="h-full min-h-[200px]">
            <Card className="glass-panel border-dashed border-white/10 hover:border-primary/30 h-full flex flex-col items-center justify-center p-6 text-center transition-all group bg-transparent">
               <div className="mb-4 p-4 bg-white/5 rounded-full group-hover:bg-primary/10 transition-colors border border-white/5 group-hover:border-primary/20">
                  <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
               </div>
               <h3 className="text-lg font-bold text-foreground mb-2 font-heading">Join Another Event</h3>
               <p className="text-xs text-muted-foreground mb-6 max-w-[200px] leading-relaxed">
                  Have an invite code? Join a friend's tournament weekend.
               </p>
               <JoinEventDialog />
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}