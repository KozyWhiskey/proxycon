'use client';

import { useEffect, useState } from 'react';
import { pauseRoundClock, resumeRoundClock, setTournamentSetup } from '@/app/weekend/actions';
import { clockSecondsLeft, formatClock } from '@/lib/weekend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAction } from '@/components/weekend/act-button';

export function RoundClock({
  tournamentId,
  durationMinutes,
  anchor,
  pausedAt,
  remainingSeconds,
  canControl,
}: {
  tournamentId: string;
  durationMinutes: number;
  anchor: string | null;
  pausedAt: string | null;
  remainingSeconds: number | null;
  canControl: boolean;
}) {
  const { pending, run } = useAction();
  const [now, setNow] = useState(() => Date.now());
  const [minutes, setMinutes] = useState(durationMinutes || 50);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const left = clockSecondsLeft({
    durationMinutes,
    anchor,
    pausedAt,
    remainingSeconds,
  }, now);

  return (
    <div className={`round-clock space-y-3 rounded-xl border border-border p-4${pausedAt ? ' is-paused' : ''}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary">Round clock</p>
        <p className="font-heading text-5xl tabular-nums">{left == null ? '—' : formatClock(left)}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        {pausedAt ? 'Paused. The clock does not enter a result.' : 'Counting down. The clock does not enter a result.'}
      </p>
      {canControl && (
        <div className="flex flex-wrap items-center gap-2">
          {pausedAt ? (
            <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => resumeRoundClock(tournamentId))}>Resume</Button>
          ) : (
            <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => pauseRoundClock(tournamentId))}>Pause</Button>
          )}
          <Input
            aria-label="Round length in minutes"
            type="number"
            min={1}
            max={300}
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value))}
            className="h-10 w-24"
          />
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => setTournamentSetup({ tournamentId, roundDuration: minutes }))}
          >
            Set length
          </Button>
        </div>
      )}
    </div>
  );
}
