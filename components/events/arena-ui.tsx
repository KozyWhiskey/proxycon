import { Check, CalendarDays, Layers, Pause } from 'lucide-react';
import { ManaIdentity } from '@/components/ui/mana-identity';
import { COLOR_DISPLAY_NAMES } from '@/lib/player-colors';
import Image from 'next/image';

export function PlayerAvatar({ name, color, small = false }: { name: string; color?: string | null; small?: boolean }) {
  return <span className={`arena-avatar${small ? ' is-small' : ''}`} aria-hidden="true">{color && COLOR_DISPLAY_NAMES[color] ? <ManaIdentity color={color} size={small ? 12 : 16} /> : name.split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase()}</span>;
}

export function GameStatus({ state, children }: { state: 'live' | 'setup' | 'complete' | 'attention'; children: React.ReactNode }) {
  return (
    <span className={`arena-status is-${state}`}>
      {state === 'complete' ? <Check size={12} /> : state === 'setup' ? <CalendarDays size={11} /> : state === 'attention' ? <Pause size={11} /> : <i />}
      {children}
    </span>
  );
}

export function DeckArt({ src, name }: { src?: string | null; name: string }) {
  return <span className="deck-art"><Layers aria-hidden="true" size={24} />{src && <Image src={src} alt={name} fill unoptimized sizes="53px" />}</span>;
}
