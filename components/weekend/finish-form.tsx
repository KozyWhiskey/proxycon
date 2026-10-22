'use client';

import { useState } from 'react';
import { resolveTieOrder } from '@/lib/weekend';
import { finishTournament } from '@/app/weekend/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAction } from '@/components/weekend/act-button';

interface Standing {
  id: string;
  name: string;
}

export function FinishForm({
  tournamentId,
  ranked,
  tieGroups,
}: {
  tournamentId: string;
  ranked: Standing[];
  tieGroups: string[][];
}) {
  const { pending, run } = useAction();
  const [order, setOrder] = useState<Record<string, string>>({});

  const [error, setError] = useState('');

  return (
    <div className="space-y-4">
      {tieGroups.map((group) => (
        <div key={group.join()} className="space-y-2 rounded-lg border border-primary/30 p-3">
          <p className="text-sm">These names are tied. Number them from 1 to {group.length} in your chosen order.</p>
          {group.map((id) => {
            const player = ranked.find((row) => row.id === id);
            return (
              <label key={id} className="flex items-center gap-2 text-sm">
                <span className="w-40 truncate">{player?.name || 'Player'}</span>
                <Input
                  inputMode="numeric"
                  type="number"
                  min={1}
                  max={group.length}
                  className="h-10 w-20"
                  placeholder="#"
                  value={order[id] || ''}
                  onChange={(event) => setOrder((current) => ({ ...current, [id]: event.target.value }))}
                />
              </label>
            );
          })}
        </div>
      ))}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button
        type="button"
        disabled={pending}
        className="font-heading"
        onClick={() => {
          const chosen = resolveTieOrder(tieGroups, order);
          if (!chosen) { setError('Give each tied player a different number, from 1 to the number of players in their group.'); return; }
          setError('');
          run(() => finishTournament({ tournamentId, order: chosen }));
        }}
      >
        Finish
      </Button>
    </div>
  );
}
