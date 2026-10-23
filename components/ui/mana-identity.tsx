import Image from 'next/image';
import { COLOR_DISPLAY_NAMES, getGuildColors } from '@/lib/player-colors';

const symbols: Record<string, string> = { white: 'W', blue: 'U', black: 'B', red: 'R', green: 'G' };
const order = ['white', 'blue', 'black', 'red', 'green'];

/** Player identity never shares the game's status or primary-action colors. */
export function ManaIdentity({ color, size = 16, decorative = false }: { color?: string | null; size?: number; decorative?: boolean }) {
  if (!color) return null;
  const colors = symbols[color] ? [color] : getGuildColors(color);
  if (!colors) return null;
  return <span className="mana-identity" role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : COLOR_DISPLAY_NAMES[color] || color}>
    {order.filter(c => colors.includes(c)).map(c => <Image key={c} src={`/mana/${symbols[c]}.svg`} width={size} height={size} alt="" aria-hidden="true" unoptimized />)}
  </span>;
}

/** Decorative signature for destination headings, never a control or status. */
export function ManaDivider() {
  return <div className="mana-divider" aria-hidden="true"><span />{order.map(c => <Image key={c} src={`/mana/${symbols[c]}.svg`} width={16} height={16} alt="" unoptimized />)}<span /></div>;
}
