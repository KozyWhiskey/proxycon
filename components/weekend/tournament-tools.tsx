'use client';

import { useState } from 'react';
import { moveSeat, renameTable, setMatchDay, setTournamentSetup, swapSealedPair } from '@/app/weekend/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAction } from '@/components/weekend/act-button';

export function RoundEditor({
  tournamentId,
  rounds,
  locked,
  pods,
  note,
  bringing,
  showPods,
  prize1st,
  prize2nd,
  prize3rd,
  duration,
}: {
  tournamentId: string;
  rounds: number;
  locked: boolean;
  pods: number;
  note: string;
  bringing: boolean;
  showPods: boolean;
  prize1st: string;
  prize2nd: string;
  prize3rd: string;
  duration: number;
}) {
  const { pending, run } = useAction();
  const [count, setCount] = useState(rounds);
  const [productNote, setProductNote] = useState(note);
  const [first, setFirst] = useState(prize1st);
  const [second, setSecond] = useState(prize2nd);
  const [third, setThird] = useState(prize3rd);
  const [length, setLength] = useState(duration || 50);

  return (
    <div className="space-y-3">
      <label className="grid gap-1 text-sm">
        Rounds
        <Input type="number" min={1} max={10} disabled={locked || pending} value={count} onChange={(event) => setCount(Number(event.target.value))} className="h-11 w-28" />
      </label>
      <p className="text-xs text-muted-foreground">Six to eight players suggests three. Nine to sixteen suggests four. Locked at the start of round 1.</p>
      <Button type="button" variant="outline" disabled={locked || pending} onClick={() => run(() => setTournamentSetup({ tournamentId, maxRounds: count }))}>
        Save rounds
      </Button>
      <label className="grid gap-1 text-sm">
        Round length, minutes
        <Input type="number" min={1} max={300} disabled={pending} value={length} onChange={(event) => setLength(Number(event.target.value))} className="h-11 w-28" />
      </label>
      <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => setTournamentSetup({ tournamentId, roundDuration: length }))}>
        Save length
      </Button>
      <p className="text-xs text-muted-foreground">Changing the length resets the countdown. It does not enter a result.</p>
      <div className="grid gap-2">
        <p className="text-sm">Prizes, optional</p>
        <Input value={first} onChange={(event) => setFirst(event.target.value)} placeholder="1st prize" />
        <Input value={second} onChange={(event) => setSecond(event.target.value)} placeholder="2nd prize" />
        <Input value={third} onChange={(event) => setThird(event.target.value)} placeholder="3rd prize" />
        <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => setTournamentSetup({ tournamentId, prize1st: first, prize2nd: second, prize3rd: third }))}>
          Save prizes
        </Button>
      </div>
      {showPods && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={pods === 2} disabled={pending} onChange={(event) => run(() => setTournamentSetup({ tournamentId, podCount: event.target.checked ? 2 : 1 }))} />
          Two pods, one leaderboard
        </label>
      )}
      <label className="grid gap-1 text-sm">
        Packs or cube
        <Input value={productNote} onChange={(event) => setProductNote(event.target.value)} />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => setTournamentSetup({ tournamentId, productNote, bringing: true }))}>
          I am bringing them
        </Button>
        <Button type="button" variant="ghost" disabled={pending || !bringing} onClick={() => run(() => setTournamentSetup({ tournamentId, productNote, bringing: false }))}>
          Clear bringer
        </Button>
      </div>
    </div>
  );
}

export function TableName({ matchId, label }: { matchId: string; label: string }) {
  const { pending, run } = useAction();
  const [value, setValue] = useState(label);
  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => renameTable(matchId, value));
      }}
    >
      <Input value={value} onChange={(event) => setValue(event.target.value)} className="h-10" />
      <Button type="submit" variant="outline" disabled={pending}>Rename</Button>
    </form>
  );
}

export function MatchDay({ matchId, day, locked }: { matchId: string; day: string; locked: boolean }) {
  const { pending, run } = useAction();
  const [value, setValue] = useState(day);
  if (locked) return <p className="text-xs text-muted-foreground">{day}</p>;
  return (
    <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); run(() => setMatchDay(matchId, value)); }}>
      <Input type="date" value={value} onChange={(event) => setValue(event.target.value)} className="h-10" />
      <Button type="submit" variant="outline" disabled={pending}>Day</Button>
    </form>
  );
}

export function SealedSwap({ tournamentId, players }: { tournamentId: string; players: { id: string; name: string }[] }) {
  const { pending, run } = useAction();
  const [a, setA] = useState(players[0]?.id || '');
  const [b, setB] = useState(players[1]?.id || '');
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <select className="h-10 rounded-md border border-border bg-card px-2" value={a} onChange={(event) => setA(event.target.value)}>
        {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
      </select>
      <span>swaps with</span>
      <select className="h-10 rounded-md border border-border bg-card px-2" value={b} onChange={(event) => setB(event.target.value)}>
        {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
      </select>
      <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => swapSealedPair(tournamentId, a, b))}>Swap</Button>
    </div>
  );
}

export function MovePlayer({
  tournamentId,
  participantId,
  seat,
  seatCount,
}: {
  tournamentId: string;
  participantId: string;
  seat: number | null;
  seatCount: number;
}) {
  const { pending, run } = useAction();
  const options = Array.from({ length: Math.max(seatCount, seat || 0) }, (_, index) => index + 1);
  return (
    <select
      className="h-9 rounded-md border border-border bg-card px-2 text-sm"
      value={seat || ''}
      disabled={pending}
      onChange={(event) => run(() => moveSeat(tournamentId, participantId, Number(event.target.value)))}
    >
      <option value="" disabled>Seat</option>
      {options.map((number) => <option key={number} value={number}>{number}</option>)}
    </select>
  );
}
