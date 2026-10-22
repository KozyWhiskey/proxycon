'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { dropActivityPlayer } from '@/app/tournament/actions';
import { toast } from 'sonner';

export default function DropPlayerButton({ tournamentId, profileId, name }: { tournamentId: string; profileId: string; name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function drop() {
    setPending(true);
    const result = await dropActivityPlayer(tournamentId, profileId);
    if (!result.success) {
      toast.error(result.message || `Could not drop ${name}`);
      setPending(false);
      return;
    }
    router.refresh();
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={drop} disabled={pending}>
      Drop
    </Button>
  );
}
