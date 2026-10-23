'use client';
import { useState } from 'react';
import { randomizeSeats } from '@/app/weekend/actions';
import { Button } from '@/components/ui/button';
import { useAction } from './act-button';

export function SeatRandomizer({ tournamentId }: { tournamentId: string }) {
  const [mode, setMode] = useState<'fill' | 'reshuffle'>('fill');
  const { pending, run } = useAction();
  return <details className="seat-randomizer"><summary>Randomize seats</summary><div>
    <label><input type="radio" name={`randomize-${tournamentId}`} checked={mode === 'fill'} disabled={pending} onChange={() => setMode('fill')} /><span><strong>Fill empty seats</strong><small>Keep claimed seats. Seat everyone still waiting.</small></span></label>
    <label><input type="radio" name={`randomize-${tournamentId}`} checked={mode === 'reshuffle'} disabled={pending} onChange={() => setMode('reshuffle')} /><span><strong>Reshuffle everyone</strong><small>Replace every claimed seat and remove extra empty seats.</small></span></label>
    <Button type="button" disabled={pending} onClick={() => run(() => randomizeSeats(tournamentId, mode))}>{pending ? 'Seating…' : mode === 'fill' ? 'Fill empty seats' : 'Reshuffle everyone'}</Button>
  </div></details>;
}
