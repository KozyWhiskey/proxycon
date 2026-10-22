'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { attachBudgetDeck } from '@/app/tournament/actions';
import { toast } from 'sonner';

export default function BudgetDeckField({
  tournamentId,
  current,
}: {
  tournamentId: string;
  current?: { name: string; price: number | null; url: string } | null;
}) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    const result = await attachBudgetDeck(tournamentId, url);
    if (!result.success) {
      toast.error(result.message || 'Could not read that deck');
      setPending(false);
      return;
    }
    setUrl('');
    toast.success('Deck list saved on this sitting');
    router.refresh();
    setPending(false);
  }

  return (
    <div className="space-y-2 rounded-lg border border-white/10 p-3">
      <p className="text-sm text-foreground">Budget deck</p>
      {current ? (
        <p className="text-xs text-muted-foreground">
          <a href={current.url} className="underline" target="_blank" rel="noreferrer">{current.name}</a>
          {current.price != null ? ` · $${Number(current.price).toFixed(2)}` : ''}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Paste a locked list from the budget deck site. The price and the cards stay on your seat, so the pairings show which list you played.</p>
      )}
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://budget-deck-site.vercel.app/decks/..."
          className="h-10"
        />
        <Button type="button" onClick={save} disabled={pending || url.trim().length === 0}>
          {pending ? 'Reading...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
