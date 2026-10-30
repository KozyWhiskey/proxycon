'use client';
import { Suspense, useState, type ReactNode } from 'react';
import BottomNav from '@/components/navigation/bottom-nav';
import { SessionHeader } from './event-context';
import { LiveRefresh } from '@/components/events/live-refresh';
import { SnapshotIdentity } from '@/components/events/snapshot-store';

export type SessionSummary = { identity: string; name: string; house: boolean; isGuest: boolean; isAdmin: boolean; fetchedAt: string };
export function SessionFrame({ current, failed = false, children }: { current?: SessionSummary | null; failed?: boolean; children: ReactNode }) {
  const [saved, setSaved] = useState(current);
  if (!failed && current !== saved) setSaved(current);
  const session = failed ? saved : current;
  if (!session) return <SnapshotIdentity.Provider value={null}>{children}</SnapshotIdentity.Provider>;
  return <SnapshotIdentity.Provider value={session.identity}><div key={session.identity} className={`app-shell${session.house ? ' house-shell' : ''}`}><a href="#page-content" className="skip-link">Skip to content</a><div className="app-content" id="page-content"><SessionHeader name={session.name} house={session.house} isGuest={session.isGuest} isAdmin={session.isAdmin} /><Suspense><LiveRefresh fetchedAt={session.fetchedAt} /></Suspense>{children}</div><BottomNav house={session.house} /></div></SnapshotIdentity.Provider>;
}
