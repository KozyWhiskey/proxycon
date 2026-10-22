'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createWeekendTournament } from '@/app/weekend/actions';
import { chicagoToday } from '@/lib/weekend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const FORMATS = [
  { id: 'set_draft', label: 'Set draft' },
  { id: 'chaos_draft', label: 'Chaos draft' },
  { id: 'cube', label: 'Cube' },
  { id: 'sealed', label: 'Sealed' },
];

export function NewTournamentForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [format, setFormat] = useState('set_draft');
  const [rounds, setRounds] = useState(3);
  const [pods, setPods] = useState(1);
  const [note, setNote] = useState('');
  const [bringing, setBringing] = useState(false);
  const [day, setDay] = useState(chicagoToday());
  const [duration, setDuration] = useState(50);
  const [prize1st, setPrize1st] = useState('');
  const [prize2nd, setPrize2nd] = useState('');
  const [prize3rd, setPrize3rd] = useState('');
  const [pending, setPending] = useState(false);
  const seated = format !== 'sealed';

  async function create() {
    setPending(true);
    try {
      const result = await createWeekendTournament({
        eventId,
        name: name.trim() || FORMATS.find((item) => item.id === format)?.label || 'Draft',
        format,
        maxRounds: rounds,
        podCount: pods,
        productNote: note,
        bringing,
        startsOn: day,
        roundDuration: duration,
        prize1st,
        prize2nd,
        prize3rd,
      });
      setPending(false);
      if (!result.success || !result.tournamentId) {
        toast.error(result.message || 'Could not create the tournament.');
        return;
      }
      router.push(`/tournament/${result.tournamentId}`);
      router.refresh();
    } catch { toast.error('Could not save. Check your connection and try again.'); }
    finally { setPending(false); }
  }

  return (
    <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void create(); }}>
      <div className="space-y-2">
        <Label htmlFor="t-name">Name</Label>
        <Input id="t-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Friday draft" />
      </div>
      <div className="flex flex-wrap gap-2">
        {FORMATS.map((item) => (
          <button key={item.id} type="button" aria-pressed={format === item.id} onClick={() => setFormat(item.id)} className={`rounded-full border px-3 py-1.5 text-sm ${format === item.id ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}>
            {item.label}
          </button>
        ))}
      </div>
      <label className="grid gap-1 text-sm">
        Rounds
        <Input type="number" min={1} max={10} value={rounds} onChange={(event) => setRounds(Number(event.target.value))} className="h-11 w-28" />
        <span className="text-xs text-muted-foreground">Six to eight players suggests three rounds. Nine to sixteen suggests four. This locks when round 1 starts.</span>
      </label>
      <label className="grid gap-1 text-sm">
        Round length, minutes
        <Input type="number" min={1} max={300} value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="h-11 w-28" />
      </label>
      <details className="disclosure"><summary>Prizes (optional)</summary><div className="space-y-4"><div className="grid gap-2">
        <p className="text-sm">Prizes</p>
        <Input aria-label="First prize" value={prize1st} onChange={(event) => setPrize1st(event.target.value)} placeholder="1st prize" />
        <Input aria-label="Second prize" value={prize2nd} onChange={(event) => setPrize2nd(event.target.value)} placeholder="2nd prize" />
        <Input aria-label="Third prize" value={prize3rd} onChange={(event) => setPrize3rd(event.target.value)} placeholder="3rd prize" />
      </div>
      </div></details>
      {seated && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={pods === 2} onChange={(event) => setPods(event.target.checked ? 2 : 1)} />
          Two pods, one leaderboard
        </label>
      )}
      <label className="grid gap-1 text-sm">
        Day
        <Input type="date" value={day} onChange={(event) => setDay(event.target.value)} className="h-11" />
      </label>
      <label className="grid gap-1 text-sm">
        Packs or cube
        <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note" />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={bringing} onChange={(event) => setBringing(event.target.checked)} />
        I am bringing them
      </label>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Creating tournament…' : 'Create tournament'}
      </Button>
    </form>
  );
}
