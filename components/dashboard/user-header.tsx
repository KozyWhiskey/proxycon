'use client';

import { Button } from '@/components/ui/button';
import { logout } from '@/app/login/actions';
import { LogOut, User } from 'lucide-react';
import { toast } from 'sonner';

interface UserHeaderProps {
  userName: string;
  userNickname: string | null;
}

export default function UserHeader({ userName, userNickname }: UserHeaderProps) {
  const displayName = userNickname || userName;

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error) {
      // Handle redirect error (it's expected)
      if (error && typeof error === 'object' && 'digest' in error) {
        const digest = (error as { digest?: string }).digest;
        if (digest?.startsWith('NEXT_REDIRECT')) {
          return; // Redirect is expected, don't show error
        }
      }
      toast.error('Failed to logout. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-between w-full p-4 bg-slate-900 border-b border-slate-800">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
          <User className="w-5 h-5 text-yellow-500" />
        </div>
        <div>
          <p className="text-sm text-slate-400">Playing as</p>
          <p className="text-lg font-semibold text-slate-100">{displayName}</p>
        </div>
      </div>
      <Button
        onClick={handleLogout}
        variant="ghost"
        className="h-12 px-4 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
        aria-label="Logout"
      >
        <LogOut className="w-5 h-5 mr-2" />
        <span className="hidden sm:inline">Logout</span>
      </Button>
    </div>
  );
}

