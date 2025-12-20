'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { logout } from '@/app/user/actions';
import { LogOut, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserHeaderProps {
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
}

export default function UserHeader({ 
  displayName, 
  username, 
  avatarUrl 
}: UserHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error) {
      if (error && typeof error === 'object' && 'digest' in error) {
        const digest = (error as { digest?: string }).digest;
        if (digest?.startsWith('NEXT_REDIRECT')) {
          return; 
        }
      }
      toast.error('Failed to logout. Please try again.');
    }
  };

  const handleProfileClick = () => {
    router.push('/profile');
  };

  return (
    <div className="flex items-center justify-between w-full p-4 glass-panel rounded-lg">
      <div 
        className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer group"
        onClick={handleProfileClick}
      >
        <Avatar className="w-12 h-12 border-2 border-primary/20 group-hover:border-primary/50 transition-colors shadow-lg shadow-primary/10">
          <AvatarImage src={avatarUrl || ''} />
          <AvatarFallback className="bg-primary/10 text-primary font-heading text-lg">
            {displayName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Playing as</p>
          <div className="flex items-center gap-2">
            <p className="text-xl font-semibold text-foreground truncate group-hover:text-primary transition-colors font-heading tracking-wide text-glow">
              {displayName}
            </p>
            <Edit2 className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
          </div>
          {username && <p className="text-xs text-muted-foreground/80">@{username}</p>}
        </div>
      </div>
      <Button
        onClick={handleLogout}
        variant="ghost"
        className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
        aria-label="Logout"
      >
        <LogOut className="w-5 h-5" />
      </Button>
    </div>
  );
}