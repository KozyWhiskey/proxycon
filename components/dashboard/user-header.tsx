'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { logout } from '@/app/user/actions';
import { LogOut, User, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserHeaderProps {
  userName: string;
  userNickname: string | null;
  userColor: string | null;
  userAvatarUrl: string | null;
}

export default function UserHeader({ 
  userName, 
  userNickname, 
  userColor, 
  userAvatarUrl 
}: UserHeaderProps) {
  const router = useRouter();
  
  // Compute display name from props
  const displayName = userNickname || userName;

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
    <div className="flex items-center justify-between w-full p-4 bg-slate-900 border-b border-slate-800">
      <div 
        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer group"
        onClick={handleProfileClick}
      >
        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30 shrink-0 transition-colors group-hover:bg-yellow-500/30">
          {userAvatarUrl ? (
             <img src={userAvatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          ) : (
             <User className="w-5 h-5 text-yellow-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-400">Playing as</p>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold text-slate-100 truncate group-hover:text-yellow-500 transition-colors">
              {displayName}
            </p>
            <Edit2 className="w-3 h-3 text-slate-500 group-hover:text-yellow-500 transition-colors" />
          </div>
        </div>
      </div>
      <Button
        onClick={handleLogout}
        variant="ghost"
        className="h-12 px-4 text-slate-400 hover:text-slate-100 hover:bg-slate-800 shrink-0"
        aria-label="Logout"
      >
        <LogOut className="w-5 h-5" />
      </Button>
    </div>
  );
}
