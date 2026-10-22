'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { launchSitting, setProductBringer } from '@/app/tournament/actions';
import { toast } from 'sonner';

export default function LaunchSitting({
  tournamentId,
  signups,
}: {
  tournamentId: string;
  signups: number;
}) {
  const [count, setCount] = useState(String(Math.max(signups, 8)));
  const [pending, setPending] = useState(false);

  async function launch() {
    setPending(true);
    const result = await launchSitting(tournamentId, Number(count));
    if (result && !result.success) {
      toast.error(result.message || 'Could not launch');
      setPending(false);
    }
  }

  async function bring(bringing: boolean) {
    const result = await setProductBringer(tournamentId, bringing);
    if (!result.success) toast.error(result.message || 'Could not update who brings the product');
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => bring(true)}>I&apos;ll bring it</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => bring(false)}>Someone else can</Button>
      </div>
      <div className="flex gap-2">
        <Input type="number" min={2} max={32} value={count} onChange={(event) => setCount(event.target.value)} className="h-10 w-24" />
        <Button type="button" onClick={launch} disabled={pending}>
          {pending ? 'Launching...' : `Launch${signups ? ` · ${signups} signed up` : ''}`}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Signed-up players take the first seats. Any seats past that stay open until someone claims the number.</p>
    </div>
  );
}
