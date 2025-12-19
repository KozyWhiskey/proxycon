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
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// Removed ScrollArea
import { Users, UserPlus, Search, X, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { addEventMember, removeEventMember, searchProfiles } from '@/app/events/actions';
import { useRouter } from 'next/navigation';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchProfiles(query);
      // Filter out existing members
      const filtered = results.filter(
        (r) => !members.some((m) => m.id === r.id)
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (profile: any) => {
    startTransition(async () => {
      const result = await addEventMember(eventId, profile.id);
      if (result.success) {
        toast.success(`Added ${profile.display_name} to event`);
        setSearchResults((prev) => prev.filter((p) => p.id !== profile.id));
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
        <Button variant="outline" size="sm" className="h-9 border-slate-700">
          <Users className="w-4 h-4 mr-2" />
          Members
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle>Manage Event Members</DialogTitle>
          <DialogDescription>
            {eventName} • {members.length} Members
          </DialogDescription>
        </DialogHeader>

        {inviteCode && (
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Invite Code</p>
              <p className="text-xl font-mono text-yellow-500 font-bold tracking-wider">
                {inviteCode}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(inviteCode);
                toast.success('Code copied to clipboard');
              }}
            >
              Copy
            </Button>
          </div>
        )}

        <div className="space-y-6 mt-4">
          {canManage && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-400">Add Members</h3>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search by username or name..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9 bg-slate-950 border-slate-800"
                />
              </div>
              
              {isSearching && (
                 <div className="flex justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                 </div>
              )}

              {searchResults.length > 0 && (
                <div className="bg-slate-950 border border-slate-800 rounded-md overflow-hidden max-h-48 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-3 hover:bg-slate-900 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={result.avatar_url || undefined} />
                          <AvatarFallback>{result.display_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-slate-200">
                            {result.display_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            @{result.username}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isPending}
                        onClick={() => handleAddMember(result)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-400">Current Members</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-slate-950/50 rounded-lg border border-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-slate-800">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback>{member.display_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {member.display_name}
                        {member.role === 'owner' && (
                          <span className="ml-2 text-xs bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded">
                            Owner
                          </span>
                        )}
                        {member.role === 'admin' && (
                           <span className="ml-2 text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                            Admin
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">@{member.username}</p>
                    </div>
                  </div>
                  
                  {canManage && member.role !== 'owner' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-slate-600 hover:text-red-500 hover:bg-red-950/20"
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
