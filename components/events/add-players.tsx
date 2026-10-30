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
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded,setExpanded]=useState(kind==='tournament');
  const [added, setAdded] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState('');
  const inRoster = new Set(memberIds);
  const available = inline ? players : players.filter(player => !inRoster.has(player.id) && !added.includes(player.id));
  const shown = [...available].sort((a,b)=>Number(inRoster.has(a.id))-Number(inRoster.has(b.id))).filter(player => `${player.name} ${player.username || ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const picker = <div className="space-y-4">
      <p className="subtle">{kind === 'event' ? 'Search the playgroup and add anyone. They don’t need to join themselves.' : 'Choose players from this event before round one starts.'}</p>
      <Input aria-label={`Search players for ${kind}`} placeholder="Search by name" value={query} onChange={event => setQuery(event.target.value)} />
      {inline && <p className="subtle text-sm">{shown.length} of {players.length} playgroup players</p>}
      {kind==='tournament' && available.length>0 && <div className="action-row"><Button variant="outline" disabled={pending} onClick={()=>setSelected(available.map(p=>p.id))}>Select all {available.length} players</Button><Button disabled={pending||!selected.length} onClick={()=>start(async()=>{setMessage('');let count=0;for(const id of selected){try{const result=await action(id);if(!result.success){setMessage(result.message||'Could not add the remaining players. Your selection is retained.');break;}count++;setAdded(v=>[...v,id]);setSelected(v=>v.filter(x=>x!==id));}catch{setMessage('Connection interrupted. Retry the remaining selected players.');break;}}if(count===selected.length){setMessage(`${count} players added.`);setExpanded(false);}router.refresh();})}>{pending?'Adding players…':`Add selected${selected.length?` (${selected.length})`:''}`}</Button></div>}
      <div className="max-h-80 overflow-y-auto">
        {shown.map(player => <div className="game-row gap-3" key={player.id}>
          {kind==='tournament'?<label className="flex min-h-11 items-center gap-3 min-w-0"><input type="checkbox" checked={selected.includes(player.id)} disabled={pending} onChange={e=>setSelected(v=>e.target.checked?[...v,player.id]:v.filter(id=>id!==player.id))}/><strong className="break-words">{player.name}</strong></label>:<div className="min-w-0"><strong className="block break-words">{player.name}</strong>{player.username && <span className="subtle text-sm">@{player.username.replace(/^@+/, '')}</span>}</div>}
          {kind!=='tournament'&&(inRoster.has(player.id) ? <span className="subtle shrink-0 text-sm">Already in event</span> : <Button variant="outline" disabled={pending} aria-label={`Add ${player.name} to ${kind}`} onClick={() => start(async () => {
            setMessage('');
            try {
              const result = await action(player.id);
              if (result.success) { setMessage(`${player.name} added.`); router.refresh(); }
              else setMessage(result.message || 'Could not add this player. Try again.');
            } catch { setMessage('Could not add this player. Check your connection and try again.'); }
          })}>Add</Button>)}
        </div>)}
        {!shown.length && <p className="subtle">{available.length ? 'No players match that name.' : `Everyone is already in this ${kind}.`}</p>}
      </div>
      <p role="status" className="text-sm">{pending ? (kind==='tournament'?`Adding players… ${selected.length} remaining`:'Adding player…') : message}</p>
    </div>;
  if (inline) return <section aria-label="Add playgroup players" className="panel"><h2 className="text-2xl mb-4">Add players</h2>{picker}</section>;
  return <details className="disclosure" open={expanded&&(kind!=='tournament'||available.length>0)} onToggle={event=>setExpanded(event.currentTarget.open)}><summary>{kind==='tournament'&&!available.length?'Players assembled':'Add players to '+kind}</summary>{picker}</details>;
}
