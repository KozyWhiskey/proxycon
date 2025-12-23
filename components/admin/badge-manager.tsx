'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge as UiBadge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Award, User, Search } from 'lucide-react';
import { getAllBadges, awardBadgeManually, searchUsers } from '@/app/admin/actions';

interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_url: string;
}

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function BadgeManager() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<string>('');
  
  const [userSearch, setUserSearch] = useState('');
  const [foundUsers, setFoundUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  
  const [loading, setLoading] = useState(false);

  // Load badges on mount (or triggered by tab change if parent handles it, but useEffect is fine)
  useState(() => {
    getAllBadges().then((res) => {
      if (res.success && res.data) {
        setBadges(res.data);
      }
    });
  });

  const handleSearchUsers = async () => {
    if (userSearch.length < 2) return;
    setLoading(true);
    const res = await searchUsers(userSearch);
    if (res.success && res.data) {
      setFoundUsers(res.data);
    }
    setLoading(false);
  };

  const handleAward = async () => {
    if (!selectedBadge || !selectedUser) {
      toast.error('Select a badge and a user');
      return;
    }

    setLoading(true);
    const res = await awardBadgeManually(selectedUser, selectedBadge);
    setLoading(false);

    if (res.success) {
      toast.success('Badge awarded successfully');
      setSelectedUser('');
      setUserSearch('');
      setFoundUsers([]);
    } else {
      toast.error(res.message || 'Failed to award badge');
    }
  };

  return (
    <Card className="glass-panel">
      <CardHeader className="border-b border-white/5 pb-6">
        <CardTitle className="text-xl text-foreground font-heading tracking-wide flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          Badge Management
        </CardTitle>
        <CardDescription className="text-muted-foreground/60 text-xs uppercase tracking-widest">
          Manually award badges to users
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-8 space-y-6">
        
        {/* Badge Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Badge</label>
          <Select value={selectedBadge} onValueChange={setSelectedBadge}>
            <SelectTrigger>
              <SelectValue placeholder="Select a badge..." />
            </SelectTrigger>
            <SelectContent>
              {badges.map((b) => (
                <SelectItem key={b.id} value={b.slug}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{b.icon_url}</span>
                    <span>{b.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedBadge && (
            <p className="text-xs text-muted-foreground">
              {badges.find(b => b.slug === selectedBadge)?.description}
            </p>
          )}
        </div>

        {/* User Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Find User</label>
          <div className="flex gap-2">
            <Input 
              placeholder="Search username..." 
              value={userSearch} 
              onChange={(e) => setUserSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
            />
            <Button variant="outline" onClick={handleSearchUsers} disabled={loading}>
              <Search className="w-4 h-4" />
            </Button>
          </div>
          
          {foundUsers.length > 0 && (
            <div className="grid grid-cols-1 gap-2 mt-2 max-h-40 overflow-y-auto border border-white/10 rounded-md p-2">
              {foundUsers.map(u => (
                <div 
                  key={u.id} 
                  className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-white/5 ${selectedUser === u.id ? 'bg-primary/20 border border-primary/50' : ''}`}
                  onClick={() => setSelectedUser(u.id)}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-full h-full p-1 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{u.display_name || u.username}</p>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <Button 
            className="w-full" 
            onClick={handleAward} 
            disabled={!selectedBadge || !selectedUser || loading}
          >
            Award Badge
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}
