'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { claimSeat } from '@/app/tournament/actions';
import { toast } from 'sonner';

export default function ClaimSeatButton({ tournamentId, participantId }: { tournamentId: string; participantId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function claim() {
    setPending(true);
    const result = await claimSeat(tournamentId, participantId);
    if (!result.success) {
      toast.error(result.message || 'Could not claim that seat');
      setPending(false);
      return;
    }
    router.refresh();
  }

  return (
    <Button type="button" size="sm" onClick={claim} disabled={pending}>
      This is me
    </Button>
  );
}
