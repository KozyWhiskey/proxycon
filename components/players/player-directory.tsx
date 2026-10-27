'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Search, ArrowUpRight, Layers } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ManaIdentity } from '@/components/ui/mana-identity';

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
  return <section className="space-y-5 directory-content">
    <div className="relative max-w-md"><Search size={18} className="absolute left-3 top-3 text-muted-foreground" /><Input aria-label="Find a player" placeholder="Find a player" value={search} onChange={event => setSearch(event.target.value)} className="pl-10" /></div>
    <p className="subtle" role="status">{shown.length} {shown.length === 1 ? 'player' : 'players'}</p>
    <div className="directory-rows">{shown.map(player => <Link href={`/players/${player.id}`} className="panel directory-row" key={player.id}>
      <div className="player-card-banner"><Avatar className="h-10 w-10"><AvatarImage src={player.avatar || undefined} alt="" /><AvatarFallback>{player.name.split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase()}</AvatarFallback></Avatar><ArrowUpRight size={18} className="text-muted-foreground" /></div>
      <h2 className="text-base">{player.name} <ManaIdentity color={player.color} />{player.id === currentId && <span className="text-xs font-normal text-muted-foreground ml-2">you</span>}</h2>
      {player.username && <p className="subtle">@{player.username.replace(/^@/, '').trim()}</p>}
      <div className="player-card-meta"><span><Layers size={14} />{player.deckCount} {player.deckCount === 1 ? 'deck' : 'decks'}</span></div>
    </Link>)}</div>
    {!shown.length && <div className="empty-state"><h2 className="text-xl">No players found</h2><p>Try another play name or username.</p></div>}
  </section>;
}
