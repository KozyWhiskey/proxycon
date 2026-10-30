'use client';
import { PendingNavigation } from '@/components/navigation/pending-navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ChartNoAxesCombined, Spade, Users } from 'lucide-react';

export function EventNav({ id, house = false, name }: { id: string; house?: boolean; name?: string }) {
  const path = usePathname();
  const base = `/events/${id}`;
  const onRoom = path.startsWith(`${base}/room`);
  const onStats = path === `${base}/stats`;
  const onPlayers = path.startsWith(`${base}/players`);
  const onPlay = !onRoom && !onStats && !onPlayers && (
    path === base
    || path.startsWith(`${base}/play`)
    || path.startsWith('/tournament/')
    || path.includes('/match/')
  );

  return (
    <nav className={`event-nav${house ? ' house-event-nav' : ''}`} aria-label="Event navigation">
      {name && <Link href={house ? `${base}/room` : base} className="event-context-name">{name}</Link>}
      <Link href={base} className="relative" aria-current={onPlay ? 'page' : undefined}><Spade size={18} />Play<PendingNavigation /></Link>
      <Link href={`${base}/stats`} className="relative" aria-current={onStats ? 'page' : undefined}><ChartNoAxesCombined size={18} />Stats<PendingNavigation /></Link>
      <Link href={`${base}/players`} className="relative" aria-current={onPlayers ? 'page' : undefined}><Users size={18} />Players<PendingNavigation /></Link>
      <Link href={`${base}/room`} className="relative" aria-current={onRoom ? 'page' : undefined}><LayoutDashboard size={18} />Room<PendingNavigation /></Link>
    </nav>
  );
}
