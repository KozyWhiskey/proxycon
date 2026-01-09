'use client';

import { useState, useTransition, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  X, 
  Check, 
  Shield, 
  Trash2
} from 'lucide-react';
import { 
  getGuildMembers, 
  updateMemberStatus, 
  removeMember, 
  searchUsers, 
  inviteUser 
} from '@/app/guilds/actions';
import { toast } from 'sonner';
import { UserSearch } from '@/components/shared/user-search';

interface Member {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  role: string;
  status: string;
  title: string;
}

export function ManageMembersDialog({ guildId, guildName }: { guildId: string, guildName: string }) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [isPending, startTransition] = useTransition();

  const loadMembers = async () => {
    const data = await getGuildMembers(guildId);
    setMembers(data as Member[]);
  };

  useEffect(() => {
    if (open) {
      loadMembers();
    }
  }, [open]);

  const handleAction = (userId: string, action: 'approve' | 'reject' | 'promote' | 'kick' | 'invite') => {
    startTransition(async () => {
      let res;
      switch (action) {
        case 'approve':
          res = await updateMemberStatus(guildId, userId, 'active');
          break;
        case 'reject':
        case 'kick':
          res = await removeMember(guildId, userId);
          break;
        case 'promote':
          res = await updateMemberStatus(guildId, userId, 'active', 'admin');
          break;
        case 'invite':
          res = await inviteUser(guildId, userId);
          break;
      }

      if (res?.success) {
        toast.success('Action completed');
        loadMembers();
      } else {
        toast.error(res?.message || 'Action failed');
      }
    });
  };
  
  const handleInvite = async (user: any) => {
    handleAction(user.id, 'invite');
  };

  const activeMembers = members.filter(m => m.status === 'active');
  const requests = members.filter(m => m.status === 'requested');
  const invited = members.filter(m => m.status === 'invited');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-white/10 hover:border-primary/50 gap-2">
          <Users className="w-4 h-4" />
          Manage Roster
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel sm:max-w-xl border-white/10 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-heading text-2xl flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            {guildName} Command
          </DialogTitle>
          <DialogDescription>
            Oversee your members, approve new applicants, and expand your ranks.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="roster" className="w-full">
          <TabsList className="w-full justify-start rounded-none bg-black/40 border-b border-white/10 h-12 px-6">
            <TabsTrigger value="roster" className="font-heading uppercase text-xs tracking-widest data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
              Roster ({activeMembers.length})
            </TabsTrigger>
            <TabsTrigger value="requests" className="font-heading uppercase text-xs tracking-widest data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
              Requests {requests.length > 0 && <Badge className="ml-2 bg-primary text-[10px] h-4 px-1">{requests.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="invite" className="font-heading uppercase text-xs tracking-widest data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none">
              <UserPlus className="w-3 h-3 mr-2" />
              Invite
            </TabsTrigger>
          </TabsList>

          <div className="p-6 h-[400px] overflow-y-auto">
            
            <TabsContent value="roster" className="mt-0 space-y-4">
              {activeMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-white/10">
                      <AvatarImage src={member.avatar_url} />
                      <AvatarFallback>{member.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{member.display_name || member.username}</p>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-tighter opacity-60">
                        {member.role}
                      </Badge>
                    </div>
                  </div>
                  
                  {member.role !== 'owner' && (
                    <div className="flex items-center gap-2">
                      {member.role === 'member' && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 px-2 text-primary"
                          onClick={() => handleAction(member.id, 'promote')}
                          disabled={isPending}
                        >
                          Promote
                        </Button>
                      )}
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-rose-500 hover:bg-rose-500/10"
                        onClick={() => handleAction(member.id, 'kick')}
                        disabled={isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="requests" className="mt-0 space-y-4">
              {requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-40">
                  <UserCheck className="w-12 h-12" />
                  <p className="text-sm italic font-heading">No pending applications</p>
                </div>
              ) : (
                requests.map(request => (
                  <div key={request.id} className="flex items-center justify-between p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={request.avatar_url} />
                        <AvatarFallback>{request.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{request.display_name || request.username}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Wants to join</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="icon" 
                        className="h-9 w-9 bg-emerald-600 hover:bg-emerald-500"
                        onClick={() => handleAction(request.id, 'approve')}
                        disabled={isPending}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        className="h-9 w-9 text-rose-500 hover:bg-rose-500/10"
                        onClick={() => handleAction(request.id, 'reject')}
                        disabled={isPending}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="invite" className="mt-0 space-y-6">
              <UserSearch 
                onSearch={(q) => searchUsers(q, guildId)}
                onSelect={handleInvite}
                excludeIds={members.map(m => m.id)}
                actionLabel="Invite"
                placeholder="Search by name or @username..."
              />
                
                {invited.length > 0 && (
                    <div className="pt-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Pending Invites</p>
                        <div className="space-y-2">
                            {invited.map(inv => (
                                <div key={inv.id} className="flex items-center justify-between p-2 text-xs opacity-60 italic">
                                    <span>{inv.display_name}</span>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 text-rose-500"
                                        onClick={() => handleAction(inv.id, 'reject')}
                                        disabled={isPending}
                                    >
                                        <X className="w-3 h-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </TabsContent>

          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}