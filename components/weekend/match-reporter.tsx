'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { matchOutcome, validTournamentScore } from '@/lib/match-outcome';
import { reportMatch } from '@/app/weekend/actions';
import { Button } from '@/components/ui/button';
import { useAction } from '@/components/weekend/act-button';
import { Check } from 'lucide-react';

interface Player { id: string; name: string; team?: number | null; result?: string | null; gamesWon?: number | null }

export function MatchReporter({ matchId, players, teams = false, returnTo, showGamesWon = false, decks, tournament = false }: {
  matchId: string; players: Player[]; teams?: boolean; returnTo?: string; showGamesWon?: boolean; decks?: Record<string, string>; tournament?: boolean;
}) {
  const router = useRouter();
  const { pending, run } = useAction();
  const named = players.filter((player) => player.id);
  const correcting = named.some((player) => player.result);
  const initialWinners = named.filter((player) => player.result === 'win').map((player) => player.id);
  const initialChoice = named.every((player) => player.result === 'draw') ? 'draw' : initialWinners.join(',') || null;
  const source = named.map((player) => ({ profileId: player.id, result: player.result || null, gamesWon: player.gamesWon ?? null }));
  const version = JSON.stringify(source);
  const [sourceVersion, setSourceVersion] = useState(version);
  const [expected, setExpected] = useState(source);
  const [choice, setChoice] = useState<string | null>(named.every((player) => player.result === 'draw') ? 'draw' : initialWinners.join(',') || null);
  const [games, setGames] = useState<Record<string, number>>(() => Object.fromEntries(named.map((player) => [player.id, player.gamesWon || 0])));
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  if (version !== sourceVersion && !dirty) {
    setSourceVersion(version);
    setExpected(source);
    setChoice(initialChoice);
    setGames(Object.fromEntries(named.map((player) => [player.id, player.gamesWon || 0])));
    setSaved(false);
  }

  const options = teams
    ? [1, 2].map((team) => ({
        value: named.filter((player) => player.team === team).map((player) => player.id).join(','),
        label: named.filter((player) => player.team === team).map((player) => player.name).join(' & '),
      })).filter((option) => option.value)
    : named.map((player) => ({ value: player.id, label: player.name }));

  const hasScore = named.every((player) => Number.isFinite(games[player.id])) && named.some((player) => (games[player.id] || 0) > 0);
  const decision = matchOutcome(
    named.map((player) => ({ profile_id: player.id, team: player.team || null })),
    hasScore ? games : undefined,
    choice === 'draw',
    choice && choice !== 'draw' ? choice.split(',') : [],
  );
  const effective = decision.draw ? 'draw' : [...decision.winners].join(',') || null;
  const winner = options.find((option) => option.value === effective)?.label;
  const summary = effective === 'draw' ? 'Draw — no winner' : winner ? `${winner} ${teams ? 'win' : 'wins'}` : '';
  const scoreLabel = named.map((player) => `${games[player.id] || 0}`).join('–');
  const previous = named.every((player) => player.result === 'draw')
    ? 'Draw'
    : `${named.filter((player) => player.result === 'win').map((player) => player.name).join(' & ')} won`;
  const canSave = Boolean(effective) && (!tournament || validTournamentScore(named.map((player) => player.id), games));

  function select(value: string) {
    setChoice(value);
    setError('');
    setSaved(false);
    setDirty(true);
    if (hasScore && effective !== value) {
      setGames(Object.fromEntries(named.map((player) => [player.id, 0])));
    }
  }

  function bump(playerId: string, delta: number) {
    setGames((current) => ({
      ...current,
      [playerId]: Math.max(0, (current[playerId] || 0) + delta),
    }));
    setChoice(null);
    setError('');
    setSaved(false);
    setDirty(true);
  }

  return (
    <div className="match-reporter space-y-4" data-editing-result={dirty && !saved ? 'true' : undefined}>
      {correcting && (
        <div className="current-result">
          <strong>Current result</strong>
          <p>
            {previous}
            {named.some((player) => (player.gamesWon || 0) > 0) ? ` · ${named.map((player) => `${player.name} ${player.gamesWon || 0}`).join(' / ')}` : ''}
          </p>
        </div>
      )}

      {tournament ? (
        <fieldset disabled={pending} className="tournament-score space-y-3">
          <legend className="text-sm font-semibold">Games won</legend>
          <p className="subtle">Use + and − to enter each player’s game wins, such as 2–0 or 2–1. The score determines the winner. Equal scores above zero record a draw.</p>
          {named.map((player) => (
            <div key={player.id} className="score-stepper">
              <span>{player.name}</span>
              <div>
                <Button type="button" aria-label={`Remove a game won by ${player.name}`} variant="outline" disabled={pending || !(games[player.id] || 0)} onClick={() => bump(player.id, -1)}>−</Button>
                <output aria-label={`${player.name} games won`}>{games[player.id] || 0}</output>
                <Button type="button" aria-label={`Add a game won by ${player.name}`} variant="outline" disabled={pending} onClick={() => bump(player.id, 1)}>+</Button>
              </div>
            </div>
          ))}
          {!hasScore && <p className="subtle">Enter a game score before saving. 0–0 is not a result.</p>}
        </fieldset>
      ) : (
        <>
          <fieldset disabled={pending} className="space-y-3">
            <legend className="mb-3 text-sm">{teams ? 'Which team won?' : 'Who won?'}</legend>
            <div className="outcome-options">
              {options.map((option) => (
                <Button key={option.value} type="button" variant="outline" aria-pressed={effective === option.value} onClick={() => select(option.value)}>
                  <Check size={16} aria-hidden="true" className={effective === option.value ? '' : 'invisible'} />
                  {option.label} {teams ? 'win' : 'wins'}
                </Button>
              ))}
              <Button type="button" variant="outline" aria-pressed={effective === 'draw'} onClick={() => select('draw')}><Check size={16} aria-hidden="true" className={effective === 'draw' ? '' : 'invisible'} />Draw</Button>
            </div>
          </fieldset>
          {showGamesWon && (
            <details className="disclosure" open={hasScore || undefined}>
              <summary>Game score (optional)</summary>
              <div className="space-y-3">
                <p className="subtle">A score such as 2–1 sets the match winner. Equal scores above zero mean a draw.</p>
                {named.map((player) => (
                  <div key={player.id} className="score-stepper">
                    <span>{player.name}</span>
                    <div>
                      <Button type="button" aria-label={`Remove a game won by ${player.name}`} variant="outline" disabled={pending || !(games[player.id] || 0)} onClick={() => bump(player.id, -1)}>−</Button>
                      <output aria-label={`${player.name} games won`}>{games[player.id] || 0}</output>
                      <Button type="button" aria-label={`Add a game won by ${player.name}`} variant="outline" disabled={pending} onClick={() => bump(player.id, 1)}>+</Button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}

      {effective && canSave && (
        <div className="result-review">
          <span>{correcting ? 'Save this correction' : 'Ready to record'}</span>
          <strong>{summary}{hasScore ? ` · ${scoreLabel}` : ''}</strong>
          {hasScore && <p>{named.map((player) => `${player.name} ${games[player.id] || 0}`).join(' · ')}</p>}
          {correcting && (tournament || showGamesWon) && (
            <p className="subtle">Standings update immediately. Unstarted next-round pairings may change; started pairings stay fixed. If already finished, finish the tournament again.</p>
          )}
        </div>
      )}
      {error && (
        <div>
          <p role="alert" className="text-destructive text-sm">{error}</p>
          <Button type="button" variant="ghost" onClick={() => { setExpected(source); setSourceVersion(version); setChoice(initialChoice); setGames(Object.fromEntries(named.map((player) => [player.id, player.gamesWon || 0]))); setDirty(false); setError(''); setSaved(false); router.refresh(); }}>Load current result</Button>
        </div>
      )}
      <Button
        type="button"
        className="save-result"
        disabled={pending || !canSave || saved || (correcting && !dirty)}
        onClick={async () => {
          setError('');
          const result = await run(() => reportMatch({
            matchId,
            draw: effective === 'draw',
            winnerIds: effective === 'draw' ? [] : effective?.split(',') || [],
            games: hasScore ? Object.fromEntries(named.map((player) => [player.id, games[player.id] || 0])) : undefined,
            decks: decks ? Object.fromEntries(named.map((player) => [player.id, decks[player.id] || null])) : undefined,
            expected,
          }));
          if (!result.success) {
            setError(result.message || 'Result was not saved. Try again.');
            return;
          }
          setSaved(true);
          setDirty(false);
          if (returnTo) router.push(returnTo);
        }}
      >
        {pending ? 'Saving…' : saved ? 'Result saved' : correcting ? 'Save correction' : 'Save result'}
      </Button>
    </div>
  );
}
