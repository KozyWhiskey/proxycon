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
    <div className={`round-clock space-y-3 rounded-xl border border-border p-4${pausedAt ? ' is-paused' : ''}${left != null && left <= 300 ? ' is-urgent' : ''}`} suppressHydrationWarning>
      <div className="flex items-baseline justify-between gap-3">
        <p className="clock-label font-mono text-xs uppercase tracking-wide text-muted-foreground">Round clock</p>
        <p className="font-mono text-5xl tabular-nums" suppressHydrationWarning>{left == null ? '—' : formatClock(left)}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        {left===0?'Time called · Matches remain open until results are recorded.':pausedAt?'Paused':'Remaining this round'}
      </p>
      {canControl && (
        <div className="flex flex-wrap items-center gap-2">
          {left!==0 && (pausedAt ? (
            <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => resumeRoundClock(tournamentId))}>Resume</Button>
          ) : (
            <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => pauseRoundClock(tournamentId))}>Pause</Button>
          ))}
          <details><summary>Change length</summary><div className="flex flex-wrap gap-2"><p className="w-full text-xs text-muted-foreground">Resetting the clock starts a new countdown, including when paused. Clock changes never enter a result.</p><Input
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
            Reset and start clock to {formatClock(minutes*60)}
          </Button>
          </div></details>
        </div>
      )}
    </div>
  );
}
