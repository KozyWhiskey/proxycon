'use client';

import { useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Check, X, Mail } from 'lucide-react';
import { updateMemberStatus, removeMember, acceptGuildInvite } from '@/app/guilds/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface InvitedGuild {
  id: string;
  name: string;
  slug: string;
  theme_color: string;
  invited_by_name?: string;
}

interface PendingInvitesProps {
  invites: InvitedGuild[];
  userId: string;
}

export default function PendingInvites({ invites, userId }: PendingInvitesProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (invites.length === 0) return null;

  const handleAccept = (guildId: string) => {
    if (!guildId) {
      toast.error("Invalid Guild ID");
      return;
    }
    startTransition(async () => {
      const res = await acceptGuildInvite(guildId);
      if (res.success) {
        toast.success('Invite accepted! Welcome to the guild.');
        router.refresh();
      } else {
        toast.error(res.message || 'Failed to accept invite');
      }
    });
  };

  const handleDecline = (guildId: string) => {
    if (!guildId) {
      toast.error("Invalid Guild ID");
      return;
    }
    startTransition(async () => {
      const res = await removeMember(guildId, userId);
      if (res.success) {
        toast.success('Invite declined.');
        router.refresh();
      } else {
        toast.error(res.message || 'Failed to decline invite');
      }
    });
  };

  return (
    <Card className="bg-amber-500/10 border-amber-500/20 mb-6">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3 text-amber-500 font-heading text-sm uppercase tracking-wider">
          <Mail className="w-4 h-4" />
          Pending Invitations
        </div>
        <div className="space-y-2">
          {invites.map((guild, index) => (
            <div key={guild.id || `unknown-${index}`} className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-zinc-800 text-muted-foreground">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">
                    {guild.name || "Unknown Guild"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {guild.invited_by_name ? `Invited by ${guild.invited_by_name}` : "Invited you to join"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  className="bg-emerald-600 hover:bg-emerald-500 text-white border-none h-8 px-3"
                  onClick={() => handleAccept(guild.id)}
                  disabled={isPending}
                >
                  <Check className="w-4 h-4 mr-1" /> Accept
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-rose-500 hover:bg-rose-500/10 h-8 px-3"
                  onClick={() => handleDecline(guild.id)}
                  disabled={isPending}
                >
                  <X className="w-4 h-4 mr-1" /> Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
