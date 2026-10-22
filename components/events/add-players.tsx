'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Player = { id: string; name: string; username?: string | null };

export function AddPlayers({ players, action, kind, inline = false, memberIds = [] }: {
  players: Player[];
  action: (profileId: string) => Promise<{ success: boolean; message?: string }>;
  kind: 'event' | 'tournament';
  inline?: boolean;
  memberIds?: string[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [pending, start] = useTransition();
  const [message, setMessage] = useState('');
  const inRoster = new Set(memberIds);
  const available = inline ? players : players.filter(player => !inRoster.has(player.id));
  const shown = available.filter(player => `${player.name} ${player.username || ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const picker = <div className="space-y-4">
      <p className="subtle">{kind === 'event' ? 'Search all platform accounts and add anyone to this event. They do not need to sign in or join themselves.' : 'Choose players from this event before round one starts.'}</p>
      <Input aria-label={`Search players for ${kind}`} placeholder="Search by name" value={query} onChange={event => setQuery(event.target.value)} />
      {inline && <p className="subtle text-sm">{shown.length} of {players.length} platform accounts</p>}
      <div className="max-h-80 overflow-y-auto">
        {shown.map(player => <div className="game-row gap-3" key={player.id}>
          <div className="min-w-0"><strong className="block break-words">{player.name}</strong>{player.username && <span className="subtle text-sm">@{player.username.replace(/^@+/, '')}</span>}</div>
          {inRoster.has(player.id) ? <span className="subtle shrink-0 text-sm">Already in event</span> : <Button variant="outline" disabled={pending} aria-label={`Add ${player.name} to ${kind}`} onClick={() => start(async () => {
            setMessage('');
            try {
              const result = await action(player.id);
              if (result.success) { setMessage(`${player.name} added.`); router.refresh(); }
              else setMessage(result.message || 'Could not add this player. Try again.');
            } catch { setMessage('Could not add this player. Check your connection and try again.'); }
          })}>Add</Button>}
        </div>)}
        {!shown.length && <p className="subtle">{available.length ? 'No players match that name.' : `Everyone is already in this ${kind}.`}</p>}
      </div>
      <p role="status" className="text-sm">{pending ? 'Adding player…' : message}</p>
    </div>;
  if (inline) return <section aria-label="Add platform players" className="panel"><h2 className="text-2xl mb-4">Add players</h2>{picker}</section>;
  return <details className="disclosure"><summary>Add players to {kind}</summary>{picker}</details>;
}
