'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { addEventMember, removeEventMember, searchProfiles } from '@/app/events/actions';
import { useRouter } from 'next/navigation';
import { UserSearch } from '@/components/shared/user-search';

interface Member {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  joined_at: string;
}

interface ManageMembersDialogProps {
  eventId: string;
  eventName: string;
  inviteCode?: string | null;
  initialMembers: Member[];
  canManage: boolean;
}

export default function ManageMembersDialog({
  eventId,
  eventName,
  inviteCode,
  initialMembers,
  canManage,
}: ManageMembersDialogProps) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleAddMember = async (profile: any) => {
    startTransition(async () => {
      const result = await addEventMember(eventId, profile.id);
      if (result.success) {
        toast.success(`Added ${profile.display_name} to event`);
        setMembers((prev) => [
          ...prev,
          {
            id: profile.id,
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            role: 'player', // Default
            joined_at: new Date().toISOString(),
          },
        ]);
        router.refresh();
      } else {
        toast.error(result.message || 'Failed to add member');
      }
    });
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    startTransition(async () => {
      const result = await removeEventMember(eventId, memberId);
      if (result.success) {
        toast.success('Member removed');
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        router.refresh();
      } else {
        toast.error(result.message || 'Failed to remove member');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 bg-white/5 border-white/10 hover:bg-white/10">
          <Users className="w-4 h-4 mr-2" />
          Members
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl glass-panel">
        <DialogHeader className="border-b border-white/5 pb-4">
          <DialogTitle className="font-heading text-xl">Manage Event Members</DialogTitle>
          <DialogDescription className="text-muted-foreground/60 text-xs uppercase tracking-widest">
            {eventName} • {members.length} Members
          </DialogDescription>
        </DialogHeader>

        {inviteCode && (
          <div className="bg-white/5 p-4 rounded-lg border border-white/5 flex items-center justify-between mt-4">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Invite Code</p>
              <p className="text-2xl font-mono text-primary font-bold tracking-widest text-glow">
                {inviteCode}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/5 border-white/10 h-10 px-4"
              onClick={() => {
                navigator.clipboard.writeText(inviteCode);
                toast.success('Code copied to clipboard');
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>
        )}

        <div className="space-y-6 mt-6">
          {canManage && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest font-heading">Add Members</h3>
              <UserSearch 
                onSearch={searchProfiles}
                onSelect={handleAddMember}
                excludeIds={members.map(m => m.id)}
              />
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest font-heading">Current Members</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-white/10 shadow-lg">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="bg-zinc-800 text-sm">{member.display_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {member.display_name}
                        {member.role === 'owner' && (
                          <span className="ml-2 text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">
                            Owner
                          </span>
                        )}
                        {member.role === 'admin' && (
                           <span className="ml-2 text-[10px] bg-zinc-800 text-muted-foreground border border-white/5 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">
                            Admin
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 font-mono uppercase tracking-wider">@{member.username}</p>
                    </div>
                  </div>
                  
                  {canManage && member.role !== 'owner' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground/40 hover:text-rose-500 hover:bg-rose-500/10 h-8 w-8"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
