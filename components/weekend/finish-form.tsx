'use client';

import { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { finishTournament } from '@/app/weekend/actions';
import { Button } from '@/components/ui/button';
import { useAction } from '@/components/weekend/act-button';

interface Standing {
  id: string;
  name: string;
}

function placeLabel(place: number) {
  if (place === 1) return '1st';
  if (place === 2) return '2nd';
  if (place === 3) return '3rd';
  const mod100 = place % 100;
  const mod10 = place % 10;
  if (mod10 === 1 && mod100 !== 11) return `${place}st`;
  if (mod10 === 2 && mod100 !== 12) return `${place}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${place}rd`;
  return `${place}th`;
}

function orderStandings(
  ranked: Standing[],
  groups: string[][],
  finalResult: { id: string; result: string | null }[],
) {
  const ordered = [...ranked];
  for (const group of groups) {
    const indices = ordered
      .map((player, index) => (group.includes(player.id) ? index : -1))
      .filter((index) => index >= 0);
    indices.forEach((index, i) => {
      ordered[index] = ranked.find((player) => player.id === group[i])!;
    });
  }

  const finalWinner = finalResult.find((player) => player.result === 'win');
  const finalLoser = finalResult.find((player) => player.result === 'loss');
  if (finalWinner && finalLoser) {
    const winnerIndex = ordered.findIndex((player) => player.id === finalWinner.id);
    const loserIndex = ordered.findIndex((player) => player.id === finalLoser.id);
    if (winnerIndex > loserIndex && loserIndex >= 0) {
      const [winner] = ordered.splice(winnerIndex, 1);
      ordered.splice(loserIndex, 0, winner);
    }
  }
  return ordered;
}

export function FinishForm({
  tournamentId,
  ranked,
  tieGroups,
  prizes = [],
  early = false,
  finalResult = [],
}: {
  tournamentId: string;
  ranked: Standing[];
  tieGroups: string[][];
  prizes?: (string | null)[];
  early?: boolean;
  finalResult?: { id: string; result: string | null }[];
}) {
  const { pending, run } = useAction();
  const [groups, setGroups] = useState(() => tieGroups.map((group) => [...group]));
  const [error, setError] = useState('');
  const version = JSON.stringify({ ranked, tieGroups, prizes, finalResult });
  const [reviewedVersion, setReviewedVersion] = useState(version);

  if (version !== reviewedVersion) {
    setReviewedVersion(version);
    setGroups(tieGroups.map((group) => [...group]));
    setError('Standings changed. Check the places again before finishing.');
  }

  const currentGroups = version === reviewedVersion ? groups : tieGroups;
  const ordered = orderStandings(ranked, currentGroups, finalResult);
  const podium = ordered.slice(0, 3);
  const rest = ordered.slice(3);
  const hasTies = currentGroups.length > 0;

  function moveTied(groupIndex: number, index: number, delta: number) {
    setGroups((current) =>
      current.map((group, i) => {
        if (i !== groupIndex) return group;
        const next = [...group];
        const swap = index + delta;
        [next[index], next[swap]] = [next[swap], next[index]];
        return next;
      }),
    );
  }

  return (
    <div className="finish-review space-y-5">
      <p className="subtle">
        {early
          ? 'End early with the current standings. Places lock; match results stay.'
          : 'Places lock when you finish. Match results stay. A later correction clears places and needs Finish again.'}
      </p>

      {hasTies &&
        currentGroups.map((group, groupIndex) => (
          <fieldset key={groupIndex} className="tie-order">
            <legend>Tied · put one name first</legend>
            <p className="subtle">Standings could not separate these players for place and prize.</p>
            {group.map((id, i) => {
              const name = ranked.find((player) => player.id === id)?.name;
              return (
                <div className="tie-row" key={id}>
                  <span>
                    {i + 1}. {name}
                  </span>
                  <div>
                    {[-1, 1].map((delta) => (
                      <Button
                        key={delta}
                        type="button"
                        variant="outline"
                        aria-label={`Move ${name} ${delta < 0 ? 'up' : 'down'}`}
                        disabled={pending || i + delta < 0 || i + delta >= group.length}
                        onClick={() => moveTied(groupIndex, i, delta)}
                      >
                        {delta < 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </fieldset>
        ))}

      <ol className="finish-podium" aria-label="Podium">
        {podium.map((player, i) => (
          <li key={player.id}>
            <span className="finish-place">{placeLabel(i + 1)}</span>
            <strong>{player.name}</strong>
            {prizes[i] ? <small>{prizes[i]}</small> : null}
          </li>
        ))}
      </ol>

      {rest.length > 0 && (
        <ol className="finish-field-rest" aria-label="Rest of the field" start={4}>
          {rest.map((player, i) => (
            <li key={player.id}>
              <span>{placeLabel(i + 4)}</span>
              <strong>{player.name}</strong>
            </li>
          ))}
        </ol>
      )}

      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}

      <Button
        type="button"
        disabled={pending}
        onClick={async () => {
          setError('');
          const result = await run(() =>
            finishTournament({ tournamentId, order: ordered.map((player) => player.id) }),
          );
          if (!result.success) setError(result.message || 'Could not finish. Try again.');
        }}
      >
        {pending ? 'Finishing…' : early ? 'End tournament with these places' : 'Finish tournament'}
      </Button>
    </div>
  );
}
