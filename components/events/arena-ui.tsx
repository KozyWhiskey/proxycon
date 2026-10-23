import { Check, Diamond, Layers } from 'lucide-react';
import { getColorClass } from '@/lib/player-colors';
import Image from 'next/image';

export function PlayerAvatar({ name, color, small = false }: { name: string; color?: string | null; small?: boolean }) {
  return <span className={`arena-avatar${small ? ' is-small' : ''}`} aria-hidden="true"><span className={`avatar-color ${getColorClass(color) || ''}`} />{name.split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase()}</span>;
}

export function GameStatus({ state, children }: { state: 'live' | 'setup' | 'complete'; children: React.ReactNode }) {
  return <span className={`arena-status is-${state}`}>{state === 'complete' ? <Check size={12} /> : state === 'setup' ? <Diamond size={11} /> : <i />}{children}</span>;
}

export function DeckArt({ src, name }: { src?: string | null; name: string }) {
  return <span className="deck-art"><Layers aria-hidden="true" size={24} />{src && <Image src={src} alt={name} fill unoptimized sizes="53px" />}</span>;
}
