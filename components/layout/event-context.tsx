'use client';
import { Brand } from './brand';
import { ThemeControl } from './theme-control';
import { LogoutButton } from '@/components/auth/logout-button';

/** Slim top bar for house mode and for phones (no side nav). Hidden on desktop player layout. */
export function SessionHeader({ name, house, isGuest }: { name: string; house: boolean; isGuest: boolean }) {
  return (
    <header className={`session-header${house ? ' is-house' : ''}`}>
      <Brand />
      <details className="session-identity session-menu">
        <summary>{house ? 'House screen' : `Playing as ${name}`} <span aria-hidden>⌄</span></summary>
        <div><LogoutButton isGuest={isGuest} variant="ghost" /></div>
      </details>
      <div className="session-tools"><ThemeControl /></div>
    </header>
  );
}
