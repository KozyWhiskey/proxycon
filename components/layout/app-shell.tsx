import { ReactNode } from 'react';
import {headers} from 'next/headers';
import BottomNav from '@/components/navigation/bottom-nav';
import { SessionHeader } from './event-context';
import { getCurrentUser } from '@/lib/get-current-user';
import { LiveRefresh } from '@/components/events/live-refresh';
export async function AppShell({ children }: { children: ReactNode }) {
  if(process.env.NODE_ENV==='development'&&process.env.WEEKEND_UX_PREVIEW==='true'&&(await headers()).get('x-proxycon-preview')==='weekend')return <>{children}</>;
  const current = await getCurrentUser();
  if (!current?.user || (!current.profile && current.mode !== 'house')) return <>{children}</>;
  const name = current.mode === 'house' ? 'House screen' : (current.profile?.display_name || current.profile?.username || 'Player');
  const house = current.mode === 'house';
  return <div key={current.profile?.id||current.mode} className={`app-shell${house ? ' house-shell' : ''}`}><a href="#page-content" className="skip-link">Skip to content</a><div className="app-content" id="page-content"><SessionHeader name={name} house={house} isGuest={Boolean(current.user.is_anonymous)} isAdmin={current.isAdmin} /><LiveRefresh fetchedAt={new Date().toISOString()} />{children}</div><BottomNav house={house} /></div>;
}
