'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { addEventPrize, awardEventPrize } from '@/app/events/prize-actions';
import { toast } from 'sonner';

interface Prize {
  id: string;
  name: string;
  note: string | null;
  awarded_to: string | null;
  awarded_name: string | null;
}

interface Person {
  id: string;
  name: string;
}

export default function PrizeShelf({
  eventId,
  prizes,
  people,
  canAward,
}: {
  eventId: string;
  prizes: Prize[];
  people: Person[];
  canAward: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);

  async function add() {
    setPending(true);
    const result = await addEventPrize(eventId, name, note);
    if (!result.success) {
      toast.error(result.message || 'Could not add that prize');
      setPending(false);
      return;
    }
    setName('');
    setNote('');
    router.refresh();
    setPending(false);
  }

  async function award(prizeId: string, profileId: string) {
    const result = await awardEventPrize(eventId, prizeId, profileId);
    if (!result.success) toast.error(result.message || 'Could not award that');
    else router.refresh();
  }

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="font-heading text-base">Prize shelf</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {prizes.length === 0 && <p className="text-sm text-muted-foreground">Nothing on the shelf yet. Add packs, promos, or whatever is already in the house.</p>}
        {prizes.map((prize) => (
          <div key={prize.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 px-3 py-2">
            <div>
              <p className="text-sm text-foreground">{prize.name}</p>
              <p className="text-xs text-muted-foreground">{prize.awarded_name ? `With ${prize.awarded_name}` : prize.note || 'Unclaimed'}</p>
            </div>
            {canAward && (
              <select
                className="h-9 rounded-md border border-white/10 bg-transparent px-2 text-sm"
                value={prize.awarded_to || ''}
                onChange={(event) => award(prize.id, event.target.value)}
              >
                <option value="">Not awarded</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>{person.name}</option>
                ))}
              </select>
            )}
          </div>
        ))}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Prize" className="h-10" />
          <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note" className="h-10" />
          <Button type="button" onClick={add} disabled={pending || !name.trim()}>Add</Button>
        </div>
      </CardContent>
    </Card>
  );
}
