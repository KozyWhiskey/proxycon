'use client';

import { useActionState } from 'react';
import { createPlaygroupProfile, type PlayerActionResult } from '@/app/who/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AddPlayerForm({ heading = 'Add a player' }: { heading?: string }) {
  const [state, action, pending] = useActionState(async (_previous: PlayerActionResult | null, formData: FormData) => {
    return createPlaygroupProfile(formData);
  }, null);

  return (
    <form action={action} className="space-y-3">
      <h2 className="text-xl">{heading}</h2>
      <p className="subtle">They can be seated and scored without opening the app. Decks and results stay on this name.</p>
      <input type="hidden" name="bind" value="0" />
      <Label htmlFor="add-player-name">Play name</Label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input id="add-player-name" name="name" required maxLength={60} placeholder="Scott" autoComplete="off" />
        <Button type="submit" disabled={pending}>{pending ? 'Adding…' : 'Add player'}</Button>
      </div>
      {state?.message && <p role="status" className="text-sm">{state.message}</p>}
    </form>
  );
}
