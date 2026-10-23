'use client';

import { useState } from 'react';
import { moveSeat } from '@/app/weekend/actions';
import { clockwiseOrder } from '@/lib/weekend';
import { getColorClass } from '@/lib/player-colors';
import { useAction } from '@/components/weekend/act-button';

interface Seat {
  number: number;
  name: string | null;
  participantId: string | null;
  color: string | null;
}

interface Person {
  participantId: string;
  name: string;
}

export function SeatChart({
  tournamentId,
  seats,
  people,
  canControl = true,
}: {
  tournamentId: string;
  seats: Seat[];
  people: Person[];
  canControl?: boolean;
}) {
  const { pending, run } = useAction();
  const [openSeat, setOpenSeat] = useState<number | null>(null);
  const layout = clockwiseOrder(seats.map((seat) => seat.number));
  const byNumber = new Map(seats.map((seat) => [seat.number, seat]));

  function renderSeat(number: number) {
    const seat = byNumber.get(number);
    const color = getColorClass(seat?.color);
    const open = openSeat === number;
    return (
      <button
        key={number}
        type="button"
        disabled={pending || !canControl}
        aria-label={`Seat ${number}, ${seat?.name || 'empty'}`}
        aria-expanded={open}
        onClick={() => setOpenSeat(open ? null : number)}
        className={`flex min-h-16 flex-1 flex-col items-center justify-center rounded-xl border px-2 py-2 text-center ${open ? 'border-primary' : 'border-border'}`}
      >
        <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Seat {number}</span>
        <span className={`seat-name flex items-center gap-1 text-sm${seat?.name ? '' : ' is-empty'}`}>
          {color && <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />}
          {seat?.name || 'Empty'}
        </span>
      </button>
    );
  }

  const chosen = byNumber.get(openSeat || 0);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-2"><div style={{ minWidth: Math.max(layout.top.length, layout.bottom.length) * 82 }}>
        <div className="flex gap-2">{layout.top.map(renderSeat)}</div>
        <div className="my-3 rounded-2xl border border-dashed border-border bg-muted py-7 text-center"><p className="text-xs text-muted-foreground">Draft table · seats run clockwise</p></div>
        {layout.bottom.length > 0 && <div className="flex gap-2">{layout.bottom.map(renderSeat)}</div>}
      </div></div>
      {openSeat != null && (
        <div className="space-y-2 rounded-xl border border-border p-3">
          <p className="text-sm text-muted-foreground">Assign seat {openSeat}{chosen?.name ? `, now ${chosen.name}` : ''}.</p>
          <div className="flex flex-wrap gap-2">
            {people.map((person) => (
              <button
                key={person.participantId}
                type="button"
                disabled={pending || person.participantId === chosen?.participantId}
                onClick={() => run(async () => {
                  const result = await moveSeat(tournamentId, person.participantId, openSeat);
                  if (result.success) setOpenSeat(null);
                  return result;
                })}
                className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-40"
              >
                {person.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
