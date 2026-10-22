'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { reportMatch } from '@/app/weekend/actions';
import { Button } from '@/components/ui/button';
import { useAction } from '@/components/weekend/act-button';

interface Player {
  id: string;
  name: string;
  team?: number | null;
}

export function MatchReporter({
  matchId,
  players,
  teams = false,
  returnTo,
  showGamesWon = false,
  decks,
}: {
  matchId: string;
  players: Player[];
  teams?: boolean;
  returnTo?: string;
  /** Tournament Swiss can store an optional 2–1 style score. Quick matches do not. */
  showGamesWon?: boolean;
  /** Optional deck ids keyed by profile id. Saved with the result. */
  decks?: Record<string, string>;
}) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [games, setGames] = useState<Record<string, number>>({});
  const named = players.filter((player) => player.id);

  async function save(action: () => Promise<{ success: boolean; message?: string }>) {
    const result = await run(action);
    if (result.success && returnTo) router.push(returnTo);
  }

  function count(id: string) {
    return games[id] || 0;
  }

  function bump(id: string, delta: number) {
    setGames((current) => ({ ...current, [id]: Math.max(0, (current[id] || 0) + delta) }));
  }

  function parsedGames() {
    const values: Record<string, number> = {};
    for (const player of named) values[player.id] = count(player.id);
    return values;
  }

  const anyScore = showGamesWon && named.some((player) => count(player.id) > 0);
  const score = anyScore ? parsedGames() : undefined;
  const deckPatch = decks
    ? Object.fromEntries(named.map((player) => [player.id, decks[player.id] || null]))
    : undefined;

  const sides = teams
    ? [1, 2].map((side) => ({
        side,
        ids: named.filter((player) => player.team === side).map((player) => player.id),
        names: named.filter((player) => player.team === side).map((player) => player.name),
      })).filter((side) => side.ids.length > 0)
    : [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {teams ? 'Pick the winning team, or mark a draw.' : 'Pick the winner, or mark a draw.'}
      </p>

      {teams ? (
        <div className="flex flex-wrap gap-2">
          {sides.map((side) => (
            <Button
              key={side.side}
              type="button"
              disabled={pending}
              className="font-heading"
              onClick={() => save(() => reportMatch({ matchId, winnerIds: side.ids, games: score, decks: deckPatch }))}
            >
              {side.names.join(' & ')} win
            </Button>
          ))}
          <Button type="button" variant="outline" disabled={pending} onClick={() => save(() => reportMatch({ matchId, draw: true, games: score, decks: deckPatch }))}>
            Draw
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {named.map((player) => (
            <Button
              key={player.id}
              type="button"
              disabled={pending}
              className="font-heading"
              onClick={() => save(() => reportMatch({ matchId, winnerIds: [player.id], games: score, decks: deckPatch }))}
            >
              {player.name} wins
            </Button>
          ))}
          <Button type="button" variant="outline" disabled={pending} onClick={() => save(() => reportMatch({ matchId, draw: true, games: score, decks: deckPatch }))}>
            Draw
          </Button>
        </div>
      )}

      {showGamesWon && (
        <details className="disclosure">
          <summary>Optional game score</summary>
          <div className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">
              For a best-of, enter games won (for example 2–1). This is only a note. Standings still use the match result above.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {named.map((player) => (
                <div key={player.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                  <span className="truncate text-sm">{player.name}</span>
                  <div className="flex items-center gap-2">
                    <Button type="button" aria-label={`Remove a game won by ${player.name}`} variant="outline" className="h-11 w-11 px-0" disabled={pending || count(player.id) === 0} onClick={() => bump(player.id, -1)}>–</Button>
                    <span className="w-6 text-center font-heading text-xl tabular-nums">{count(player.id)}</span>
                    <Button type="button" aria-label={`Add a game won by ${player.name}`} variant="outline" className="h-11 w-11 px-0" disabled={pending} onClick={() => bump(player.id, 1)}>+</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
