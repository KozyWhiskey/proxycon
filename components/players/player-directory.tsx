'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Search, ArrowUpRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { getColorClass } from '@/lib/player-colors';

export interface DirectoryPlayer {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
  color: string | null;
  deckCount: number;
}

export function PlayerDirectory({ players, currentId }: { players: DirectoryPlayer[]; currentId: string | null }) {
  const [search, setSearch] = useState('');
  const shown = players.filter(player => `${player.name} ${player.username || ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <section className="space-y-5">
    <div className="relative max-w-md"><Search size={18} className="absolute left-3 top-3 text-muted-foreground" /><Input aria-label="Find a player" placeholder="Find a player" value={search} onChange={event => setSearch(event.target.value)} className="pl-10" /></div>
    <p className="subtle" role="status">{shown.length} {shown.length === 1 ? 'player' : 'players'}</p>
    <div className="player-grid">{shown.map(player => <Link href={`/players/${player.id}`} className="panel player-card" key={player.id}>
      <div className="flex items-start justify-between gap-3"><Avatar className="h-14 w-14"><AvatarImage src={player.avatar || undefined} alt="" /><AvatarFallback>{player.name.slice(0,2).toUpperCase()}</AvatarFallback></Avatar><ArrowUpRight size={18} className="text-muted-foreground" /></div>
      <h2 className="text-2xl mt-5">{player.name}{player.id === currentId && <span className="text-xs font-normal text-muted-foreground ml-2">you</span>}</h2>
      {player.username && <p className="subtle">@{player.username.replace(/^@/, '').trim()}</p>}
      <div className="flex items-center justify-between mt-5 text-sm text-muted-foreground"><span>{player.deckCount} {player.deckCount === 1 ? 'deck' : 'decks'}</span>{player.color && <span className={`h-3 w-3 rounded-full ${getColorClass(player.color) || 'bg-muted'}`} aria-label={player.color} />}</div>
    </Link>)}</div>
    {!shown.length && <div className="empty-state"><h2 className="text-xl">No players found</h2><p>Try another play name or username.</p></div>}
  </section>;
}
