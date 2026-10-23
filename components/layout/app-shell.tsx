import { ReactNode } from 'react';
import BottomNav from '@/components/navigation/bottom-nav';
import { SideNav } from './side-nav';
import { SessionHeader } from './event-context';
import { LogoutButton } from '@/components/auth/logout-button';
import { getCurrentUser } from '@/lib/get-current-user';
import { LiveRefresh } from '@/components/events/live-refresh';
export async function AppShell({ children }: { children: ReactNode }) {
  const current = await getCurrentUser();
  if (!current?.user || (!current.profile && current.mode !== 'house')) return <>{children}</>;
  const name = current.mode === 'house' ? 'House screen' : (current.profile?.display_name || current.profile?.username || 'Player');
  const house = current.mode === 'house';
  return <div className={`app-shell${house ? ' house-shell' : ''}`}><a href="#page-content" className="skip-link">Skip to content</a>{!house && <SideNav isGuest={Boolean(current.user.is_anonymous)} userRole={current.isAdmin ? 'admin' : 'user'} name={name} />}<div className="app-content" id="page-content"><SessionHeader name={name} house={house} isGuest={Boolean(current.user.is_anonymous)} /><LiveRefresh />{children}<footer className="session-footer"><LogoutButton isGuest={Boolean(current.user.is_anonymous)} variant="ghost" /></footer></div><BottomNav house={house} /></div>;
}
