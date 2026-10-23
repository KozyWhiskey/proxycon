'use client';

import { useState } from 'react';
import { MatchReporter } from '@/components/weekend/match-reporter';
import { PlayerAvatar, DeckArt } from '@/components/events/arena-ui';

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
  image?: string | null;
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
    <div className="space-y-6 quick-table-detail">
      <div className="quick-seat-grid">
        {players.map((player) => {
          const profileId = player.profileId;
          const mine = profileId ? decks.filter((deck) => deck.ownerId === profileId) : [];
          const recorded = deckLabel(finished ? player.deckId : deckIds[profileId || ''] || player.deckId);
          const deck = decks.find(d => d.id === (finished ? player.deckId : deckIds[profileId || ''] || player.deckId));

          return (
            <div key={player.id} className={`quick-seat-card${player.result === 'win' ? ' is-winner' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <PlayerAvatar name={player.name} color={player.color} small />
                  <strong className="truncate">{player.name}</strong>
                  {player.team ? <span className="subtle">Team {player.team}</span> : null}
                </div>
                {finished && (
                  <span className="result-tag shrink-0">
                    {player.result === 'win' ? 'Winner' : player.result === 'loss' ? 'Loss' : 'Draw'}
                    {showGames ? ` (${player.gamesWon || 0})` : ''}
                  </span>
                )}
              </div>
              <div className="seat-commander"><DeckArt src={deck?.image} name={deck?.commanders || 'Deck'} /><div><span className="arena-caption">AT THE TABLE WITH</span><strong>{deck?.commanders || deck?.name || 'Deck not recorded'}</strong></div></div>

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
              result: player.result,
              gamesWon: player.gamesWon,
            }))}
          />
        </div>
      )}
    </div>
  );
}
