import { ReactNode } from 'react';
import {headers} from 'next/headers';
import { getCurrentUser } from '@/lib/get-current-user';
import { SessionFrame } from './session-frame';
import { unstable_rethrow } from 'next/navigation';
export async function AppShell({ children }: { children: ReactNode }) {
  if(process.env.NODE_ENV==='development'&&process.env.WEEKEND_UX_PREVIEW==='true'&&(await headers()).get('x-proxycon-preview')==='weekend')return <>{children}</>;
  let current = null;
  let failed = false;
  try { current = await getCurrentUser(); }
  catch (error) { unstable_rethrow(error); failed = true; }
  if (failed) return <SessionFrame failed>{children}</SessionFrame>;
  if (!current?.user || (!current.profile && current.mode !== 'house')) return <SessionFrame current={null}>{children}</SessionFrame>;
  const name = current.mode === 'house' ? 'House screen' : (current.profile?.display_name || current.profile?.username || 'Player');
  const house = current.mode === 'house';
  return <SessionFrame current={{ identity: current.profile?.id || current.mode, name, house, isGuest: Boolean(current.user.is_anonymous), isAdmin: current.isAdmin, fetchedAt: new Date().toISOString() }}>{children}</SessionFrame>;
}
