'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { joinPod, reportPodResult } from '@/app/tournament/actions';
import ShareCode from '@/components/join/share-code';
import { toast } from 'sonner';

interface PodPlayer {
  id: string;
  name: string;
  result: string | null;
}

export default function PodTable({
  matchId,
  tableNumber,
  joinCode,
  players,
  currentProfileId,
  teamWin,
}: {
  matchId: string;
  tableNumber: number | null;
  joinCode: string | null;
  players: PodPlayer[];
  currentProfileId: string;
  teamWin: boolean;
}) {
  const router = useRouter();
  const [winners, setWinners] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const finished = players.length > 0 && players.every((player) => player.result !== null);
  const seated = players.some((player) => player.id === currentProfileId);

  function toggle(id: string) {
    if (teamWin) {
      setWinners((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
      return;
    }
    setWinners([id]);
  }

  async function sit() {
    setPending(true);
    const result = await joinPod(matchId);
    if (!result.success) toast.error(result.message || 'Could not sit down');
    setPending(false);
    router.refresh();
  }

  async function report() {
    setPending(true);
    const result = await reportPodResult(matchId, winners);
    if (!result.success) {
      toast.error(result.message || 'Could not save the result');
      setPending(false);
      return;
    }
    toast.success('Table saved');
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-white/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-heading">{tableNumber ? `Table ${tableNumber}` : 'Table'}</p>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{finished ? 'Finished' : `${players.length} seated`}</p>
      </div>
      {joinCode && <ShareCode path={`/join/table/${joinCode}`} code={joinCode} label="Sit down" />}
      <div className="space-y-2">
        {players.map((player) => (
          <button
            key={player.id}
            type="button"
            disabled={finished}
            onClick={() => toggle(player.id)}
            className={`w-full text-left rounded-md border px-3 py-2 text-sm ${winners.includes(player.id) || player.result === 'win' ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-white/10'}`}
          >
            {player.name}{player.result === 'win' ? ' · won' : ''}
          </button>
        ))}
      </div>
      {!finished && !seated && players.length < 4 && (
        <Button onClick={sit} disabled={pending} variant="outline" className="w-full">Sit at this table</Button>
      )}
      {!finished && seated && (
        <Button onClick={report} disabled={pending || winners.length === 0} className="w-full">
          {teamWin ? 'Save winning team' : 'Save winner'}
        </Button>
      )}
    </div>
  );
}
