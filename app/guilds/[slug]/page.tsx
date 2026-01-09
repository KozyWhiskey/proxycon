import { notFound } from 'next/navigation';
import { getGuildBySlug, getGuildMembers, getGuildEvents, getGuildFeed } from '@/app/guilds/actions';
import { requireProfile } from '@/lib/get-current-user';
import { Separator } from '@/components/ui/separator';
import { Shield, Users, Crown, Calendar, Swords } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ManageMembersDialog } from '@/components/guilds/manage-members-dialog';
import { DeleteGuildDialog } from '@/components/guilds/delete-guild-dialog';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function GuildDashboard({ params }: PageProps) {
  const { slug } = await params;
  const { user } = await requireProfile();
  
  const guild = await getGuildBySlug(slug);

  if (!guild) {
    notFound();
  }

  // Parallel data fetching
  const [members, events, feed] = await Promise.all([
    getGuildMembers(guild.id),
    getGuildEvents(guild.id),
    getGuildFeed(guild.id),
  ]);

  const currentUserMembership = members.find((m: any) => m.id === user.id);
  const isAdmin = currentUserMembership?.role === 'owner' || currentUserMembership?.role === 'admin';
  const isOwner = currentUserMembership?.role === 'owner';
  const activeMembers = members.filter((m: any) => m.status === 'active');
  
  // Theme color mapping
  const themeColors: Record<string, string> = {
    gold: 'from-amber-700 to-yellow-600',
    blue: 'from-blue-700 to-cyan-600',
    red: 'from-red-700 to-orange-600',
    green: 'from-emerald-700 to-green-600',
    black: 'from-zinc-800 to-zinc-950',
  };

  const bgGradient = themeColors[guild.theme_color || 'gold'] || themeColors.gold;

  return (
    <div className="min-h-screen pb-20">
      {/* 1. Hero Banner */}
      <div className={`relative h-48 md:h-64 bg-gradient-to-r ${bgGradient}`}>
        {/* Stronger Gradient Overlay for Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
        <div className="absolute inset-0 bg-grid-white/[0.1] bg-[length:32px_32px]" />
        
        <div className="max-w-7xl mx-auto px-4 h-full flex flex-col justify-end pb-8 relative z-10">
          <div className="flex items-end justify-between gap-6">
            <div className="flex items-end gap-6">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-zinc-900 border-4 border-zinc-950 shadow-2xl flex items-center justify-center text-primary transform translate-y-4">
                {/* Logo Placeholder */}
                <Shield className="w-12 h-12 md:w-16 md:h-16 text-white/20" />
                </div>
                
                <div className="mb-2">
                <h1 className="text-3xl md:text-5xl font-heading font-bold tracking-tight text-white drop-shadow-lg">
                    {guild.name}
                </h1>
                <p className="text-white/80 font-medium flex items-center gap-2 mt-1">
                    <span className="opacity-60">@{guild.slug}</span>
                    <span className="w-1 h-1 bg-white/40 rounded-full" />
                    <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {activeMembers.length} Planeswalkers
                    </span>
                </p>
                </div>
            </div>

            {/* Actions */}
            <div className="mb-4 hidden md:flex items-center gap-3">
                 {isAdmin && <ManageMembersDialog guildId={guild.id} guildName={guild.name} />}
                 {isOwner && <DeleteGuildDialog guildId={guild.id} guildName={guild.name} />}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-12 md:pt-8 grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Main Feed / Content */}
        <div className="md:col-span-8 space-y-8">
            {/* Mobile Actions */}
            <div className="md:hidden flex flex-wrap gap-3">
                {isAdmin && <ManageMembersDialog guildId={guild.id} guildName={guild.name} />}
                {isOwner && <DeleteGuildDialog guildId={guild.id} guildName={guild.name} />}
            </div>

            {/* Campaigns Section */}
            {(events.length > 0) && (
                <section className="space-y-8">
                    {/* Active Campaigns */}
                    {events.some((e: any) => e.is_active) && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-heading tracking-wide flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-primary" />
                                    Active Campaigns
                                </h2>
                                {isAdmin && (
                                    <Button asChild variant="ghost" size="sm">
                                        <Link href={`/events/new?guildId=${guild.id}`}>+ New Event</Link>
                                    </Button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {events.filter((e: any) => e.is_active).map((event: any) => (
                                    <Link key={event.id} href={`/events/${event.id}`}>
                                        <Card className="glass-panel hover:border-primary/50 transition-colors h-full border-primary/20">
                                            <CardHeader>
                                                <CardTitle className="font-heading text-lg">{event.name}</CardTitle>
                                                <p className="text-xs text-muted-foreground uppercase tracking-widest text-primary">
                                                    In Progress
                                                </p>
                                            </CardHeader>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Completed Campaigns */}
                    {events.some((e: any) => !e.is_active) && (
                        <div className="space-y-4">
                             <div className="flex items-center justify-between">
                                <h2 className="text-lg font-heading tracking-wide flex items-center gap-2 text-muted-foreground/60">
                                    <Calendar className="w-5 h-5" />
                                    Past Campaigns
                                </h2>
                                {/* Show button here if no active events exist, so it's always visible somewhere */}
                                {isAdmin && !events.some((e: any) => e.is_active) && (
                                    <Button asChild variant="ghost" size="sm">
                                        <Link href={`/events/new?guildId=${guild.id}`}>+ New Event</Link>
                                    </Button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {events.filter((e: any) => !e.is_active).map((event: any) => (
                                    <Link key={event.id} href={`/events/${event.id}`}>
                                        <Card className="glass-panel hover:border-white/20 transition-colors h-full opacity-60 hover:opacity-100">
                                            <CardHeader>
                                                <CardTitle className="font-heading text-lg">{event.name}</CardTitle>
                                                <p className="text-xs text-muted-foreground uppercase tracking-widest">
                                                    Completed
                                                </p>
                                            </CardHeader>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            )}

            {/* Feed */}
            {feed.length > 0 ? (
                <section className="space-y-4">
                    <h2 className="text-lg font-heading tracking-wide flex items-center gap-2">
                        <Swords className="w-5 h-5 text-primary" />
                        Battle Log
                    </h2>
                    <div className="space-y-4">
                        {feed.map((match: any) => {
                            const winners = match.participants.filter((p: any) => p.result === 'win');
                            const winnerNames = winners.map((w: any) => w.player?.display_name || 'Unknown').join(' & ');
                            
                            return (
                                <Card key={match.id} className="glass-panel border-white/5">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-sm">
                                                <span className="text-primary font-bold">{winnerNames}</span> won a match
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {match.game_type} • {match.event?.name}
                                            </p>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest">
                                            {formatDistanceToNow(new Date(match.created_at), { addSuffix: true })}
                                        </span>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </section>
            ) : (
                <div className="glass-panel p-8 rounded-xl flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
                    <Crown className="w-12 h-12 text-muted-foreground/20" />
                    <h2 className="text-xl font-heading text-muted-foreground">The Sanctuary is Quiet</h2>
                    <p className="max-w-md text-sm text-muted-foreground/60">
                    No events have been recorded in this guild yet. Start a new Crusade (Event) to populate the feed.
                    </p>
                    {/* Show Create Event button if admin/owner */}
                    {isAdmin && (
                        <Button asChild variant="outline" className="mt-4 border-white/10 hover:border-primary/50">
                            <Link href={`/events/new?guildId=${guild.id}`}>
                                Start a Crusade
                            </Link>
                        </Button>
                    )}
                </div>
            )}
        </div>

        {/* Sidebar: Roster & Stats */}
        <div className="md:col-span-4 space-y-6">
          
          {/* Members List */}
          <div className="glass-panel p-6 rounded-xl space-y-4">
            <h3 className="font-heading text-lg flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Roster
            </h3>
            <Separator className="bg-white/5" />
            
            <div className="space-y-3">
              {activeMembers.map((member: any) => (
                <div key={member.id} className="flex items-center gap-3">
                  <Avatar className="w-8 h-8 border border-white/10">
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback>{member.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {member.display_name || member.username}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {member.title || member.role}
                    </p>
                  </div>
                  {member.role === 'owner' && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/20 text-amber-500">
                      GM
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Guild Info */}
           <div className="glass-panel p-6 rounded-xl space-y-4">
            <h3 className="font-heading text-lg">About</h3>
            <p className="text-sm text-muted-foreground">
               Established {new Date(guild.created_at).toLocaleDateString()}
            </p>
           </div>

        </div>
      </div>
    </div>
  );
}
