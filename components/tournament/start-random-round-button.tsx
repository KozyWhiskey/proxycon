'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { startRandomRound1 } from '@/app/tournament/actions';
import { toast } from 'sonner';

export default function StartRandomRoundButton({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function start() {
    setPending(true);
    const result = await startRandomRound1(tournamentId);
    if (!result.success) {
      toast.error(result.message || 'Could not start the round');
      setPending(false);
      return;
    }
    router.refresh();
  }

  return (
    <Button onClick={start} disabled={pending} className="w-full h-12">
      {pending ? 'Pairing...' : 'Pair round 1'}
    </Button>
  );
}
