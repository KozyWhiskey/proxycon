import { ReactNode } from 'react';
import BottomNav from '@/components/navigation/bottom-nav';
import { SideNav } from './side-nav';
import { Brand } from './brand';
import { LogoutButton } from '@/components/auth/logout-button';
import { getCurrentUser } from '@/lib/get-current-user';
export async function AppShell({ children }: { children: ReactNode }) {
  const current = await getCurrentUser();
  if (!current?.user || (!current.profile && current.mode !== 'house')) return <>{children}</>;
  const name = current.mode === 'house' ? 'House screen' : (current.profile?.display_name || current.profile?.username || 'Player');
  return <div className="app-shell"><a href="#page-content" className="skip-link">Skip to content</a><SideNav isGuest={Boolean(current.user.is_anonymous)} userRole={current.isAdmin ? 'admin' : 'user'} name={name} /><div className="app-content" id="page-content"><div className="mobile-brand"><Brand /><LogoutButton isGuest={Boolean(current.user.is_anonymous)} variant="ghost" /></div>{children}</div><BottomNav /></div>;
}
