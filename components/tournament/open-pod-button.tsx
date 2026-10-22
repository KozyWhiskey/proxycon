'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createPod } from '@/app/tournament/actions';
import { toast } from 'sonner';

export default function OpenPodButton({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function open() {
    setPending(true);
    const result = await createPod(tournamentId);
    if (!result.success) {
      toast.error(result.message || 'Could not open a table');
      setPending(false);
      return;
    }
    router.refresh();
  }

  return (
    <Button onClick={open} disabled={pending} className="w-full h-12">
      {pending ? 'Opening...' : 'Open a table'}
    </Button>
  );
}
