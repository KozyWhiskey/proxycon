'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Layers, UserRound, SlidersHorizontal, ArrowUpRight, Users } from 'lucide-react';
import { Brand } from './brand';
import { LogoutButton } from '@/components/auth/logout-button';
export function SideNav({ userRole = 'user', name = 'Player', isGuest = false }: { userRole?: 'user' | 'admin'; name?: string; isGuest?: boolean }) {
  const path = usePathname();
  const items = [
    { href: '/', label: 'Events', icon: CalendarDays, active: path === '/' || path.startsWith('/events') || path.startsWith('/tournament') },
    { href: '/decks', label: 'My decks', icon: Layers, active: path.startsWith('/decks') },
    { href: '/players', label: 'Players', icon: Users, active: path.startsWith('/players') },
    { href: '/profile', label: 'My profile', icon: UserRound, active: path.startsWith('/profile') },
    ...(userRole === 'admin' ? [{ href: '/admin', label: 'Administration', icon: SlidersHorizontal, active: path.startsWith('/admin') }] : []),
  ];
  return <aside className="side-nav"><Brand /><p className="nav-caption">YOUR PLAYGROUP</p>
    <nav aria-label="Main navigation">{items.map(item => <Link key={item.href} href={item.href} className={item.active ? 'side-link active' : 'side-link'} aria-current={item.active ? 'page' : undefined}><item.icon size={19} strokeWidth={1.7} />{item.label}</Link>)}</nav>
    <div className="sidebar-note"><p>Planning the next game night?</p><span>Create an event and share it with the playgroup.</span><Link href="/events/new">Create event <ArrowUpRight size={14} /></Link></div>
    <Link href="/profile" className="sidebar-person"><span className="person-avatar">{name.slice(0, 2).toUpperCase()}</span><span><strong>{name}</strong><small>Your player profile</small></span></Link>
    <LogoutButton isGuest={isGuest} variant="ghost" className="sidebar-logout" />
  </aside>;
}
