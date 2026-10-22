'use client';

import { useActionState } from 'react';
import { unstable_rethrow } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
import { logout } from '@/app/user/actions';
import { Button } from '@/components/ui/button';

export function LogoutButton({ isGuest = false, className, variant = 'outline' }: {
  isGuest?: boolean;
  className?: string;
  variant?: 'outline' | 'ghost';
}) {
  const [state, action, pending] = useActionState(async () => {
    try { return await logout(); }
    catch (error) {
      unstable_rethrow(error);
      return { message: 'Could not log out. Check your connection and try again.' };
    }
  }, { message: '' });

  return <form action={action}>
    <Button type="submit" variant={variant} className={className} disabled={pending}>
      {pending ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
      {pending ? (isGuest ? 'Switching…' : 'Logging out…') : isGuest ? 'Switch player' : 'Log out'}
    </Button>
    {state.message && <p role="alert" className="mt-2 text-sm text-destructive">{state.message}</p>}
  </form>;
}
