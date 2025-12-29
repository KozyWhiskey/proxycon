'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Plus, ArrowRight, Check, X, Clock } from 'lucide-react';
import { CreateGuildDialog } from '@/components/guilds/create-guild-dialog';
import { updateMemberStatus, removeMember } from '@/app/guilds/actions';
import { useTransition } from 'react';
import { toast } from 'sonner';

interface Guild {
  id: string;
  name: string;
  slug: string;
  theme_color: string;
  role: string;
  status: 'active' | 'invited' | 'requested';
}

interface MyGuildsProps {
  guilds: Guild[];
  userId: string;
}

export default function MyGuilds({ guilds, userId }: MyGuildsProps) {
  const [isPending, startTransition] = useTransition();

  const handleAccept = (guildId: string) => {
    startTransition(async () => {
      const res = await updateMemberStatus(guildId, userId, 'active');
      if (res.success) {
        toast.success('Welcome to the guild!');
      } else {
        toast.error(res.message || 'Failed to join');
      }
    });
  };

  const handleDecline = (guildId: string) => {
    startTransition(async () => {
      const res = await removeMember(guildId, userId);
      if (res.success) {
        toast.success('Invitation declined');
      } else {
        toast.error(res.message || 'Failed to decline');
      }
    });
  };

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="font-heading tracking-wide flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5 text-primary" />
          My Guilds
        </CardTitle>
        <CreateGuildDialog>
           <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10">
             <Plus className="w-4 h-4" />
           </Button>
        </CreateGuildDialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {guilds.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              You haven't joined any guilds yet.
            </p>
            <CreateGuildDialog>
              <Button variant="outline" size="sm" className="border-white/10 hover:border-primary/50">
                Create a Guild
              </Button>
            </CreateGuildDialog>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {guilds.map((guild) => {
              const isActive = guild.status === 'active';
              const isInvited = guild.status === 'invited';
              const isRequested = guild.status === 'requested';

              return (
                <div key={guild.id} className="group relative">
                  {isActive ? (
                    <Link href={`/guilds/${guild.slug}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5 hover:border-primary/30 hover:bg-white/5 transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${getThemeGradient(guild.theme_color)} text-white shadow-inner`}>
                            <span className="font-heading font-bold text-xs">
                              {guild.name.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-sm group-hover:text-primary transition-colors">
                              {guild.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              {guild.role}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-dashed border-white/10 italic">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-zinc-800 text-muted-foreground opacity-50`}>
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-muted-foreground">
                            {guild.name}
                          </p>
                          <p className="text-[10px] text-primary uppercase tracking-wider flex items-center gap-1">
                            {isInvited ? 'Invitation Received' : 'Request Pending'}
                            {isRequested && <Clock className="w-3 h-3 animate-pulse" />}
                          </p>
                        </div>
                      </div>
                      
                      {isInvited && (
                        <div className="flex items-center gap-2">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/10"
                            onClick={() => handleAccept(guild.id)}
                            disabled={isPending}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-rose-500 hover:bg-rose-500/10"
                            onClick={() => handleDecline(guild.id)}
                            disabled={isPending}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getThemeGradient(color: string | null) {
  const map: Record<string, string> = {
    gold: 'from-amber-700 to-yellow-600',
    blue: 'from-blue-700 to-cyan-600',
    red: 'from-red-700 to-orange-600',
    green: 'from-emerald-700 to-green-600',
    black: 'from-zinc-800 to-zinc-950',
  };
  return map[color || 'gold'] || map.gold;
}
