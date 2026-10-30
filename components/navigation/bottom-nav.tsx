'use client';
import { PendingNavigation } from '@/components/navigation/pending-navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Layers, UserRound, Users } from 'lucide-react';
export default function BottomNav({ house = false }: { house?: boolean }) {
  const path = usePathname();
  if (house || (/^\/events\/[^/]+/.test(path) && !path.startsWith('/events/new')) || /^\/tournament\/[^/]+/.test(path)) return null;
  return <nav className="bottom-nav" aria-label="Main navigation">{[
    { href: '/events', label: 'Events', icon: CalendarDays, active: path === '/' || path.startsWith('/events') || path.startsWith('/tournament') },
    { href: '/decks', label: 'My decks', icon: Layers, active: path.startsWith('/decks') },
    { href: '/players', label: 'Players', icon: Users, active: path.startsWith('/players') },
    { href: '/profile', label: 'Profile', icon: UserRound, active: path.startsWith('/profile') },
  ].map(item => <Link className="relative" key={item.href} href={item.href} aria-current={item.active ? 'page' : undefined}><item.icon size={21} /><span>{item.label}</span><PendingNavigation /></Link>)}</nav>;
}
