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
  finishOrder?:number|null;
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
  commander=false,
}: {
  matchId: string;
  players: Seat[];
  decks: DeckOption[];
  teams: boolean;
  finished: boolean;
  canReport: boolean;
  returnTo: string;
  commander?:boolean;
}) {
  const [deckIds, setDeckIds] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const player of players) {
      if (player.profileId && player.deckId) initial[player.profileId] = player.deckId;
    }
    return initial;
  });

  const showGames = players.some((player) => (player.gamesWon || 0) > 0);

  const reporter = canReport ? (
    <MatchReporter
      matchId={matchId}
      finishingOrder={commander}
      teams={teams}
      returnTo={returnTo}
      decks={deckIds}
      players={players.filter((player) => player.profileId).map((player) => ({
        id: player.profileId!,
        name: player.name,
        team: player.team,
        result: player.result,
        gamesWon: player.gamesWon,
        finishOrder:player.finishOrder,
      }))}
    />
  ) : null;

  return (
    <div className="space-y-6 quick-table-detail">
      {!finished && reporter && (
        <div className="space-y-3">
          <h2 className="text-xl">Report the result</h2>
          {reporter}
        </div>
      )}

      <div className={`quick-seat-grid${finished?' is-complete':''}`}>
        {players.map((player) => {
          const profileId = player.profileId;
          const mine = profileId ? decks.filter((deck) => deck.ownerId === profileId) : [];
          const selectedId = finished ? player.deckId : deckIds[profileId || ''] || player.deckId;
          const deck = decks.find((row) => row.id === selectedId);
          const hasDeck = Boolean(deck?.commanders || deck?.name);
          const resultClass =
            player.result === 'win' ? ' is-win' : player.result === 'loss' ? ' is-loss' : player.result === 'draw' ? ' is-draw' : '';

          return (
            <div key={player.id} className={`quick-seat-card${player.result === 'win' ? ' is-winner' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <PlayerAvatar name={player.name} color={player.color} small />
                  <strong className="break-words">{player.name}</strong>
                  {player.team ? <span className="subtle">Team {player.team}</span> : null}
                </div>
                {finished && (
                  <span className={`result-tag shrink-0${resultClass}`}>
                    {player.result === 'win' ? 'Won' : player.result === 'loss' ? 'Lost' : 'Draw'}
                    {showGames ? ` · ${player.gamesWon || 0}` : ''}
                  </span>
                )}
              </div>

              {finished&&player.finishOrder&&<p className="subtle text-sm">Finishing position {player.finishOrder}</p>}
              {hasDeck ? (
                <div className="seat-commander">
                  <DeckArt src={deck?.image} name={deck?.commanders || deck?.name || 'Deck'} />
                  <div>
                    <span className="arena-caption">Commander</span>
                    <strong>{deck?.commanders || deck?.name}</strong>
                  </div>
                </div>
              ) : finished ? (
                <p className="subtle text-sm mt-3">Deck not recorded</p>
              ) : null}

              {canReport && profileId && !finished && (
                <label className="grid gap-1 text-sm">
                  <span className="subtle">Deck (optional)</span>
                  <select
                    className="h-11 rounded-md border border-border bg-card px-3"
                    value={deckIds[profileId] || ''}
                    onChange={(event) => setDeckIds((current) => ({ ...current, [profileId]: event.target.value }))}
                  >
                    <option value="">No deck yet</option>
                    {mine.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}{option.commanders ? ` · ${option.commanders}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          );
        })}
      </div>

      {finished && reporter && (
        <details className="disclosure">
          <summary>Correct this result</summary>
          <div>{reporter}</div>
        </details>
      )}
    </div>
  );
}
