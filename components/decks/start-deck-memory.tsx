'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function StartDeckMemory({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return <section className="panel space-y-4">
    <p>Your deck and photos stay private until you choose to share them after the tournament.</p>
    <p className="text-sm text-muted-foreground">You can start with a photo or enter cards by name.</p>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <Button disabled={pending} onClick={async () => {
      setPending(true); setError('');
      try {
        const response = await fetch('/api/deck-memories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tournamentId }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not start a deck memory.');
        router.push(`/decks/limited/${result.id}`);
      } catch(e) { setError(e instanceof Error ? e.message : 'Could not start.'); setPending(false); }
    }}>{pending ? 'Opening…' : 'Start deck memory'}</Button>
  </section>;
}
