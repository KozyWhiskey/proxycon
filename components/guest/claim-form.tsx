'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ArrowRight, Smartphone } from 'lucide-react';
import { claimGuestSpot } from '@/app/guest/actions';
import type { GuestInvitation } from '@/lib/guest-access';
import { Button } from '@/components/ui/button';

export function GuestClaimForm({ invitation, token }: { invitation: GuestInvitation; token: string }) {
  const [selected, setSelected] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const spot = invitation.spots.find(row => row.id === selected);

  async function claim() {
    if (!spot || pending) return;
    setPending(true);
    setError('');
    try {
      const result = await claimGuestSpot(token, spot.id);
      if (!result.success) { setError(result.message); router.refresh(); return; }
      router.replace(`/events/${result.eventId}`);
      router.refresh();
    } catch { setError('Could not connect. Try again.'); }
    finally { setPending(false); }
  }

  return <section className="panel space-y-6">
    <div><h2 className="text-2xl">Which player are you?</h2><p className="subtle mt-2">Choose the spot your admin saved for you.</p></div>
    <div className="guest-name-grid">{invitation.spots.map(row => <button key={row.id} type="button" className="guest-name" aria-pressed={row.id === selected} disabled={pending || row.claimed} onClick={() => { setSelected(row.id); setError(''); }}>
      <span className="person-avatar">{row.name.slice(0,2).toUpperCase()}</span><span><strong>{row.name}</strong><small>{row.claimed ? 'Already claimed' : 'Available'}</small></span>{row.id === selected && <Check size={18} />}
    </button>)}</div>
    {!invitation.spots.some(row => !row.claimed) && <p className="subtle">No spots are available. Ask your admin to add your name.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="button" className="w-full" disabled={pending || !spot || spot.claimed} onClick={claim}>{pending ? 'Getting your spot…' : spot ? `Continue as ${spot.name}` : 'Select your name'}<ArrowRight size={16} /></Button>
    <p className="subtle flex gap-2"><Smartphone size={18} className="shrink-0 mt-1" /><span>This browser remembers you. No email, password, or Google account needed. Keep this browser data during the weekend.</span></p>
    <p className="subtle">Already have an account? <Link href={`/login?next=${encodeURIComponent('/events/' + invitation.eventId)}`} className="text-primary underline">Sign in instead</Link></p>
  </section>;
}
