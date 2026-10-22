'use client';

import { useState } from 'react';
import { MatchReporter } from '@/components/weekend/match-reporter';
import { getColorClass } from '@/lib/player-colors';

interface Seat {
  id: string;
  profileId: string | null;
  name: string;
  team: number | null;
  result: string | null;
  gamesWon: number | null;
  deckId: string | null;
  color: string | null;
}

interface DeckOption {
  id: string;
  ownerId: string;
  name: string;
  commanders: string;
}

export function QuickMatchTable({
  matchId,
  players,
  decks,
  teams,
  finished,
  canReport,
  returnTo,
}: {
  matchId: string;
  players: Seat[];
  decks: DeckOption[];
  teams: boolean;
  finished: boolean;
  canReport: boolean;
  returnTo: string;
}) {
  const [deckIds, setDeckIds] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const player of players) {
      if (player.profileId && player.deckId) initial[player.profileId] = player.deckId;
    }
    return initial;
  });

  const showGames = players.some((player) => (player.gamesWon || 0) > 0);

  function deckLabel(deckId: string | null | undefined) {
    if (!deckId) return null;
    const deck = decks.find((row) => row.id === deckId);
    if (!deck) return null;
    return deck.commanders ? `${deck.name} · ${deck.commanders}` : deck.name;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {players.map((player) => {
          const color = getColorClass(player.color);
          const profileId = player.profileId;
          const mine = profileId ? decks.filter((deck) => deck.ownerId === profileId) : [];
          const recorded = deckLabel(finished ? player.deckId : deckIds[profileId || ''] || player.deckId);

          return (
            <div key={player.id} className="space-y-2 rounded-lg border border-border px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {color && <span className={`h-3 w-3 shrink-0 rounded-full ${color}`} />}
                  <strong className="truncate">{player.name}</strong>
                  {player.team ? <span className="subtle">Team {player.team}</span> : null}
                </div>
                {finished && (
                  <span className="result-tag shrink-0">
                    {player.result}
                    {showGames ? ` (${player.gamesWon || 0})` : ''}
                  </span>
                )}
              </div>

              {canReport && profileId && !finished && (
                <label className="grid gap-1 text-sm">
                  <span className="subtle">Deck</span>
                  <select
                    className="h-11 rounded-md border border-border bg-card px-3"
                    value={deckIds[profileId] || ''}
                    onChange={(event) => setDeckIds((current) => ({ ...current, [profileId]: event.target.value }))}
                  >
                    <option value="">No deck yet</option>
                    {mine.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name}{deck.commanders ? ` · ${deck.commanders}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {(finished || (!canReport && recorded)) && (
                <p className="subtle text-sm">{recorded || 'No deck recorded'}</p>
              )}
            </div>
          );
        })}
      </div>

      {canReport && (
        <div className="space-y-3">
          <h2 className="text-xl">{finished ? 'Replace the result' : 'Report the result'}</h2>
          <MatchReporter
            matchId={matchId}
            teams={teams}
            returnTo={returnTo}
            decks={deckIds}
            players={players.filter((player) => player.profileId).map((player) => ({
              id: player.profileId!,
              name: player.name,
              team: player.team,
            }))}
          />
        </div>
      )}
    </div>
  );
}
