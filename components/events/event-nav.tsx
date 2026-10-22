'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ChartNoAxesCombined, SlidersHorizontal, Spade } from 'lucide-react';
export function EventNav({ id }: { id: string }) {
  const path = usePathname();
  const base = `/events/${id}`;
  return <nav className="event-nav" aria-label="Event navigation">{[
    { href: base, title: 'Play', icon: Spade },
    { href: `${base}/room`, title: 'Room', icon: LayoutDashboard },
    { href: `${base}/stats`, title: 'Statistics', icon: ChartNoAxesCombined },
    { href: `${base}/manage`, title: 'Manage', icon: SlidersHorizontal },
  ].map(item => <Link key={item.href} href={item.href} aria-current={path === item.href ? 'page' : undefined}><item.icon size={17} />{item.title}</Link>)}</nav>;
}
