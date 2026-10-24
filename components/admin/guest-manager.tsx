'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Link2 } from 'lucide-react';
import { createGuestInvitation, addGuestSpot } from '@/app/guest/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ShareCode from '@/components/join/share-code';

export interface AdminGuestInvitation {
  id: string;
  event_id: string;
  expires_at: string;
  spots: { id: string; display_name: string; profile_id: string | null }[];
}

export function GuestManager({ events, invitations, ready, houseOrigin, profileNames }: {
  events: { id: string; name: string }[];
  invitations: AdminGuestInvitation[];
  ready: boolean;
  houseOrigin: string;
  profileNames: string[];
}) {
  const router = useRouter();
  const [eventId, setEventId] = useState(events[0]?.id || '');
  const [link, setLink] = useState<{ eventId: string; id: string; token: string } | null>(null);
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const existing = invitations.find(row => row.event_id === eventId);
  const activeLink = link?.eventId === eventId ? link : null;
  const invitationId = activeLink?.id || existing?.id;
  const matchingName = profileNames.some(existingName => existingName.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase());

  async function makeLink() {
    setPending(true); setError('');
    try {
      const result = await createGuestInvitation(eventId);
      if (!result.success) { setError(result.message); return; }
      setLink({ eventId, id: result.invitationId, token: result.token });
      router.refresh();
    } catch { setError('Could not create the guest link. Try again.'); }
    finally { setPending(false); }
  }
  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invitationId || pending) return;
    setPending(true); setError('');
    try {
      const result = await addGuestSpot(invitationId, name);
      if (!result.success) { setError(result.message || 'Could not add this player.'); return; }
      setName(''); toast.success('Guest spot added.'); router.refresh();
    } catch { setError('Could not add the player. Try again.'); }
    finally { setPending(false); }
  }

  return <section className="panel space-y-6">
    <div><h2 className="text-2xl">Weekend guests</h2><p className="subtle mt-2">Save names, share one link, and let friends claim a spot on their phone.</p></div>
    {!ready && <p role="status" className="subtle">Weekend guest access needs Supabase setup before you can create spots.</p>}
    <label className="grid gap-2 text-sm">Event<select className="h-11 rounded-md border border-input bg-card px-3" value={eventId} onChange={event => { setEventId(event.target.value); setError(''); }}>{events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}</select></label>
    {!events.length && <p className="subtle">Create an event before adding weekend guests.</p>}
    <div className="space-y-3"><Button type="button" variant="outline" onClick={makeLink} disabled={!ready || !eventId || pending}><Link2 size={16} />{existing ? 'Replace guest link' : 'Create guest link'}</Button>
      <p className="subtle">{existing ? 'Replacing the link disables the previous link. Claimed phones keep access.' : 'Guest links stay valid for 90 days. Share yours only with your playgroup.'}</p>
      {activeLink && <ShareCode path={`/guest/${activeLink.token}`} code="Weekend guests" label="Scan to pick your name" houseOrigin={houseOrigin} large />}
      {existing && !activeLink && <p className="subtle">A guest list already exists. You can add names, or replace the link to share a new one.</p>}
    </div>
    <form onSubmit={add} className="space-y-3"><label className="grid gap-2 text-sm">Player name<Input value={name} onChange={event => setName(event.target.value)} placeholder="Scott" maxLength={60} required disabled={!ready || !invitationId || pending} /></label>
      {matchingName && <p className="text-sm text-amber-800">A profile with this name already exists. This creates a separate weekend guest; it does not claim or change that account or its decks. Use a distinct play name if these are different people.</p>}
      <Button type="submit" disabled={!ready || !invitationId || pending || !name.trim()}><Plus size={16} />Add guest spot</Button>
    </form>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div>{(existing?.spots || []).map(spot => <div className="game-row" key={spot.id}><strong>{spot.display_name}</strong>{spot.profile_id ? <Link className="text-link text-sm" href={`/players/${spot.profile_id}`}>Claimed · view profile →</Link> : <span className="subtle">Ready to claim</span>}</div>)}</div>
    <p className="subtle">Claiming creates a guest profile. Keep the same browser for the weekend.</p>
  </section>;
}
