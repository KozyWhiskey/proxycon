'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Layers, Users, UserRound, ChevronDown } from 'lucide-react';
import { Brand } from './brand';
import { ThemeControl } from './theme-control';
import { LogoutButton } from '@/components/auth/logout-button';

export function SessionHeader({ name, house, isGuest, isAdmin = false, eventMode=false }: { name: string; house: boolean; isGuest: boolean; isAdmin?: boolean;eventMode?:boolean }) {
  const path = usePathname();
  const inEvent = eventMode || (path.startsWith('/events/') && !path.startsWith('/events/new')) || path.startsWith('/tournament/');
  const items = [
    { href: '/events', label: 'Events', icon: CalendarDays, active: path === '/' || path.startsWith('/events') },
    ...(!house ? [
      { href: '/decks', label: 'My decks', icon: Layers, active: path.startsWith('/decks') },
      { href: '/players', label: 'Players', icon: Users, active: path.startsWith('/players') },
      { href: '/profile', label: 'Profile', icon: UserRound, active: path.startsWith('/profile') },
    ] : []),
  ];
  return <header className={house ? 'session-header is-house' : 'session-header'}>
    <Brand />{inEvent && <Link className="event-switch-link" href="/events">Events</Link>}
    {!inEvent && <nav className="global-nav" aria-label="Main navigation">{items.map(item => <Link key={item.href} href={item.href} aria-current={item.active ? 'page' : undefined}><item.icon size={17} aria-hidden="true" />{item.label}</Link>)}</nav>}
    <div className="session-tools">
      <details className="session-identity session-menu" key={path}>
        <summary><span>{house ? 'House screen' : 'Playing as ' + name}</span><ChevronDown size={15} aria-hidden="true" /></summary>
        <div>{items.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}{isAdmin && <Link href="/admin">Administration</Link>}<LogoutButton isGuest={isGuest} variant="ghost" /></div>
      </details>
      <ThemeControl />
    </div>
  </header>;
}
