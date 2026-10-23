import Link from 'next/link';
import { ArrowUpRight, CalendarDays, Layers, Monitor, Swords, Users, UserRound, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

const icons: Record<string, LucideIcon> = { calendar: CalendarDays, decks: Layers, room: Monitor, game: Swords, players: Users, profile: UserRound };

export function PageIntro({ eyebrow, title, description, actions, children, compact = false }: { eyebrow: string; title: ReactNode; description?: string; actions?: ReactNode; children?: ReactNode; compact?: boolean }) {
  return (
    <header className={`collection-heading${compact ? ' is-compact' : ''}`}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="subtle">{description}</p>}
        {children}
      </div>
      {actions && <div className="collection-actions">{actions}</div>}
    </header>
  );
}

export function FeaturePanel({ icon = 'decks', eyebrow, title, description, href, action, tone = 'ember' }: { icon?: keyof typeof icons; eyebrow: string; title: ReactNode; description: string; href: string; action: string; tone?: 'ember' | 'blue' | 'green' }) {
  const Icon = icons[icon] || Layers;
  return (
    <Link href={href} className={`feature-panel tone-${tone}`}>
      <Icon size={26} aria-hidden="true" />
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <span className="feature-action">{action}<ArrowUpRight size={16} /></span>
      <span className="feature-card-outline" aria-hidden="true" />
    </Link>
  );
}

export function FormIdentity({ icon = 'game', title, description, children }: { icon?: keyof typeof icons; title: string; description: string; children?: ReactNode }) {
  const Icon = icons[icon] || Swords;
  return (
    <aside className={`form-identity identity-${icon}`}>
      <Icon size={28} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
      <span className="feature-card-outline" aria-hidden="true" />
    </aside>
  );
}
