'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { saveQuickMatch } from '@/app/weekend/actions';
import { QUICK_FORMATS, chicagoToday, isCommanderFormat, quickFormat } from '@/lib/weekend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlayerAvatar } from '@/components/events/arena-ui';
import { Check } from 'lucide-react';

interface Person {
  id: string;
  name: string;
}

interface DeckOption {
  id: string;
  ownerId: string;
  name: string;
  commanders: string;
}

export function QuickMatchForm({
  eventId,
  people,
  decks,
  replay,
}: {
  eventId: string;
  people: Person[];
  decks: DeckOption[];
  replay?: {
    format: string;
    profileIds: string[];
    deckIds: Record<string, string>;
    teams: Record<string, number>;
    customName?: string;
  };
}) {
  const router = useRouter();
  const [format, setFormat] = useState(replay?.format || 'commander');
  const [customName, setCustomName] = useState(replay?.customName || '');
  const [selected, setSelected] = useState<string[]>(replay?.profileIds || []);
  const [teams, setTeams] = useState<Record<string, number>>(replay?.teams || {});
  const [deckIds, setDeckIds] = useState<Record<string, string>>(replay?.deckIds || {});
  const [winnerIds, setWinnerIds] = useState<string[]>([]);
  const [draw, setDraw] = useState(false);
  const [day, setDay] = useState(chicagoToday());
  const [order, setOrder] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const spec = quickFormat(format);
  const canStart = selected.length >= spec.min;
  const startHint =
    selected.length === 0
      ? `Select ${spec.min === spec.max ? spec.min : `${spec.min}–${spec.max}`} players to start.`
      : selected.length < spec.min
        ? `Select ${spec.min - selected.length} more player${spec.min - selected.length === 1 ? '' : 's'}.`
        : null;

  function toggle(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((player) => player !== id);
      if (current.length >= spec.max) return current;
      return [...current, id];
    });
    setWinnerIds([]);
    setDraw(false);
  }

  const chosen = useMemo(() => people.filter((person) => selected.includes(person.id)), [people, selected]);

  async function save(withResult: boolean) {
    if (selected.length < spec.min) {
      toast.error(`${spec.label} needs ${spec.min === spec.max ? spec.min : `${spec.min} to ${spec.max}`} players.`);
      return;
    }
    setPending(true);
    try {
      const result = await saveQuickMatch({
        eventId,
        format,
        customName: format === 'custom' ? customName : undefined,
        profileIds: selected,
        teams: spec.teams ? teams : undefined,
        deckIds,
        winnerIds: withResult && !draw ? winnerIds : [],
        draw: withResult && draw,
        playedOn: day,
        finishOrder: isCommanderFormat(format) ? order : undefined,
      });
      setPending(false);
      if (!result.success) {
        toast.error(result.message || 'Could not save the game.');
        return;
      }
      toast.success(result.message || 'Saved.');
      if (!withResult && result.matchId) router.push(`/events/${eventId}/match/${result.matchId}`);
      else router.push(`/events/${eventId}`);
      router.refresh();
    } catch {
      toast.error('Could not save. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6 quick-create-form">
      <div className="space-y-2">
        <Label htmlFor="quick-format">Game format</Label>
        <select
          id="quick-format"
          className="h-12 w-full rounded-md border border-input bg-card px-3 text-base"
          value={format}
          onChange={(event) => {
            setFormat(event.target.value);
            setSelected([]);
            setWinnerIds([]);
            setDraw(false);
          }}
        >
          <optgroup label="Commander">
            {QUICK_FORMATS.filter((item) => isCommanderFormat(item.id)).map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </optgroup>
          <optgroup label="Other games">
            {QUICK_FORMATS.filter((item) => !isCommanderFormat(item.id)).map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </optgroup>
        </select>
      </div>

      {format === 'custom' && (
        <div className="space-y-2">
          <Label htmlFor="customName">Name</Label>
          <Input id="customName" value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="What is this table?" />
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">Players</h2>
          <p className="text-xs text-muted-foreground">
            {selected.length} selected · {spec.min === spec.max ? `${spec.min} needed` : `${spec.min}–${spec.max} players`}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {people.map((person) => {
            const on = selected.includes(person.id);
            return (
              <button
                key={person.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(person.id)}
                className="setup-player-choice"
              >
                <PlayerAvatar name={person.name} small />
                <span>{person.name}</span>
                {on && <Check size={16} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>

      {spec.teams && chosen.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Teams</h2>
          {chosen.map((person) => (
            <div key={person.id} className="flex items-center justify-between gap-3">
              <span>{person.name}</span>
              <div className="flex gap-2">
                {[1, 2].map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setTeams((current) => ({ ...current, [person.id]: side }))}
                    className={`rounded-md border px-3 py-2 text-sm min-h-11 ${teams[person.id] === side ? 'border-primary text-link' : 'border-border'}`}
                  >
                    Team {side}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Button type="button" disabled={pending || !canStart} className="w-full" onClick={() => save(false)}>
          {pending ? 'Saving game…' : 'Start game'}
        </Button>
        {startHint && <p className="text-xs text-muted-foreground">{startHint}</p>}
      </div>

      <details className="disclosure">
        <summary>Optional details</summary>
        <div className="space-y-4">
          {chosen.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold">Decks</h2>
              <p className="text-xs text-muted-foreground">Optional now. You can add commanders with the result.</p>
              {chosen.map((person) => {
                const mine = decks.filter((deck) => deck.ownerId === person.id);
                return (
                  <label key={person.id} className="grid gap-1 text-sm">
                    <span>{person.name}</span>
                    <select
                      className="h-11 rounded-md border border-border bg-card px-3"
                      value={deckIds[person.id] || ''}
                      onChange={(event) => setDeckIds((current) => ({ ...current, [person.id]: event.target.value }))}
                    >
                      <option value="">No deck yet</option>
                      {mine.map((deck) => (
                        <option key={deck.id} value={deck.id}>
                          {deck.name}{deck.commanders ? ` · ${deck.commanders}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="quick-day">Day</Label>
            <Input id="quick-day" type="date" value={day} onChange={(event) => setDay(event.target.value)} className="h-11" />
          </div>
        </div>
      </details>

      {canStart && (
        <details className="disclosure">
          <summary>Already finished? Record a result</summary>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {spec.teams
                ? [1, 2].map((side) => {
                    const ids = chosen.filter((person) => teams[person.id] === side).map((person) => person.id);
                    const names = chosen.filter((person) => teams[person.id] === side).map((person) => person.name);
                    if (ids.length === 0) return null;
                    const on = !draw && ids.every((id) => winnerIds.includes(id)) && winnerIds.length === ids.length;
                    return (
                      <button
                        key={side}
                        type="button"
                        onClick={() => { setDraw(false); setWinnerIds(ids); }}
                        className={`rounded-lg border px-3 py-2 min-h-11 ${on ? 'border-primary text-link' : 'border-border'}`}
                      >
                        {names.join(' & ')} win
                      </button>
                    );
                  })
                : chosen.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => { setDraw(false); setWinnerIds([person.id]); }}
                      className={`rounded-lg border px-3 py-2 min-h-11 ${!draw && winnerIds.length === 1 && winnerIds[0] === person.id ? 'border-primary text-link' : 'border-border'}`}
                    >
                      {person.name} wins
                    </button>
                  ))}
              <button
                type="button"
                onClick={() => { setDraw(true); setWinnerIds([]); }}
                className={`rounded-lg border px-3 py-2 min-h-11 ${draw ? 'border-primary text-link' : 'border-border'}`}
              >
                Draw
              </button>
            </div>
            {isCommanderFormat(format) && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Finishing order is optional and does not change the win.</p>
                {chosen.map((person) => (
                  <label key={person.id} className="flex items-center gap-2 text-sm">
                    <span className="w-32 truncate">{person.name}</span>
                    <Input
                      inputMode="numeric"
                      className="h-10 w-20"
                      placeholder="#"
                      value={order.includes(person.id) ? String(order.indexOf(person.id) + 1) : ''}
                      onChange={(event) => {
                        const place = Number(event.target.value);
                        setOrder((current) => {
                          const next = current.filter((id) => id !== person.id);
                          if (!place) return next;
                          next.splice(place - 1, 0, person.id);
                          return next;
                        });
                      }}
                    />
                  </label>
                ))}
              </div>
            )}
            <Button type="button" disabled={pending || (!draw && !winnerIds.length)} onClick={() => save(true)}>
              Save result
            </Button>
          </div>
        </details>
      )}
    </div>
  );
}
