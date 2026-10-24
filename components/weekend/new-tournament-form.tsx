'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createWeekendTournament } from '@/app/weekend/actions';
import { chicagoToday } from '@/lib/weekend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Layers, Shuffle, Box, PackageOpen, Check } from 'lucide-react';

const FORMATS = [
  { id: 'set_draft', label: 'Set draft', detail: 'Numbered seats. Pair across the table.', icon: Layers },
  { id: 'chaos_draft', label: 'Chaos draft', detail: 'Mixed packs. Same seating as set draft.', icon: Shuffle },
  { id: 'cube', label: 'Cube', detail: 'Your cube. Numbered seats.', icon: Box },
  { id: 'sealed', label: 'Sealed', detail: 'No draft seats. Random round 1.', icon: PackageOpen },
];

export function NewTournamentForm({ eventId, house = false }: { eventId: string; house?: boolean }) {
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
        podCount: seated ? pods : 1,
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
      router.push(house ? `/events/${eventId}/room?tournament=${result.tournamentId}` : `/tournament/${result.tournamentId}`);
      router.refresh();
    } catch {
      toast.error('Could not save. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="space-y-5 tournament-create-form"
      onSubmit={(event) => {
        event.preventDefault();
        void create();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="t-name">Name</Label>
        <Input
          id="t-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Friday draft"
        />
      </div>

      <div className="space-y-2">
        <Label id="t-format-label">Format</Label>
        <div className="format-choice-grid" role="group" aria-labelledby="t-format-label">
          {FORMATS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="format-choice"
              aria-pressed={format === item.id}
              onClick={() => {
                setFormat(item.id);
                if (item.id === 'sealed') setPods(1);
              }}
            >
              <item.icon size={23} aria-hidden="true" />
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
              {format === item.id && <Check size={14} className="format-selected" aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="t-rounds">Rounds</Label>
        <Input
          id="t-rounds"
          type="number"
          min={1}
          max={10}
          value={rounds}
          onChange={(event) => setRounds(Number(event.target.value))}
          className="h-11 w-28"
        />
        <p className="text-xs text-muted-foreground">
          3 for 6–8 players, 4 for 9–16. Locks when round 1 starts.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="t-duration">Round length, minutes</Label>
        <Input
          id="t-duration"
          type="number"
          min={1}
          max={300}
          value={duration}
          onChange={(event) => setDuration(Number(event.target.value))}
          className="h-11 w-28"
        />
      </div>

      {seated && (
        <label className="flex items-center gap-3 text-sm min-h-11">
          <input
            id="t-pods"
            type="checkbox"
            checked={pods === 2}
            onChange={(event) => setPods(event.target.checked ? 2 : 1)}
            className="size-5 accent-[var(--action)]"
          />
          <span>Two pods, one leaderboard</span>
        </label>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Creating tournament…' : 'Create tournament'}
      </Button>

      <details className="disclosure">
        <summary>Optional details</summary>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="t-day">Day</Label>
            <Input
              id="t-day"
              type="date"
              value={day}
              onChange={(event) => setDay(event.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="t-note">Packs or cube</Label>
            <Input
              id="t-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional note"
            />
          </div>

          {!house && (
            <label className="flex items-center gap-3 text-sm min-h-11">
              <input
                id="t-bringing"
                type="checkbox"
                checked={bringing}
                onChange={(event) => setBringing(event.target.checked)}
                className="size-5 accent-[var(--action)]"
              />
              <span>I am bringing them</span>
            </label>
          )}

          <div className="space-y-2">
            <Label htmlFor="t-prize-1">1st prize</Label>
            <Input
              id="t-prize-1"
              value={prize1st}
              onChange={(event) => setPrize1st(event.target.value)}
              placeholder="Optional"
            />
            <Label htmlFor="t-prize-2">2nd prize</Label>
            <Input
              id="t-prize-2"
              value={prize2nd}
              onChange={(event) => setPrize2nd(event.target.value)}
              placeholder="Optional"
            />
            <Label htmlFor="t-prize-3">3rd prize</Label>
            <Input
              id="t-prize-3"
              value={prize3rd}
              onChange={(event) => setPrize3rd(event.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
      </details>
    </form>
  );
}
