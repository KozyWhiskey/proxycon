'use client';
import { useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { matchOutcome, validTournamentScore } from '@/lib/match-outcome';
import { reportMatch, currentMatchResult } from '@/app/weekend/actions';
import { Button } from '@/components/ui/button';
import { useAction } from '@/components/weekend/act-button';
import { Check } from 'lucide-react';

import { ReportDialogContext } from './report-dialog-context';

interface Player { id: string; name: string; team?: number | null; result?: string | null; gamesWon?: number | null; finishOrder?:number|null }

export function MatchReporter({ matchId, players, teams = false, returnTo, showGamesWon = false, decks, consequence, finishingOrder=false, tournament = false }: {
  matchId: string; players: Player[]; teams?: boolean; returnTo?: string; showGamesWon?: boolean; decks?: Record<string, string>; tournament?: boolean; consequence?:string; finishingOrder?:boolean;
}) {
  const router = useRouter();
  const dialog = useContext(ReportDialogContext);
  const { pending, run } = useAction({ refreshOnSuccess: !returnTo });
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
  const [positions,setPositions]=useState<Record<string,string>>(()=>Object.fromEntries(named.map(p=>[p.id,p.finishOrder?String(p.finishOrder):''])));
  const [positionsDirty,setPositionsDirty]=useState(false);
  const supplied=Object.values(positions).filter(Boolean);
  const positionsValid=supplied.every(v=>Number.isInteger(Number(v))&&Number(v)>=1&&Number(v)<=named.length)&&new Set(supplied.map(Number)).size===supplied.length;
  const [error, setError] = useState('');
  const [conflict,setConflict]=useState<typeof source|null>(null);
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
  const scoreOrder = tournament && decision.winners.size === 1 && named.length === 2 ? [...named].sort((a, b) => Number(decision.winners.has(b.id)) - Number(decision.winners.has(a.id))) : named;
  const scoreLabel = scoreOrder.map((player) => `${games[player.id] || 0}`).join('–');
  const previous = named.every((player) => player.result === 'draw')
    ? 'Draw'
    : `${named.filter((player) => player.result === 'win').map((player) => player.name).join(' & ')} won`;
  const changed=tournament?named.some(p=>(games[p.id]||0)!==(expected.find(e=>e.profileId===p.id)?.gamesWon||0)):effective!==initialChoice||positionsDirty;
  const canSave = Boolean(effective) && (!tournament || validTournamentScore(named.map((player) => player.id), games));

  function select(value: string) {
    dialog?.editing();
    setChoice(value);
    setError('');
    setSaved(false);
    setDirty(true);
    if (hasScore && effective !== value) {
      setGames(Object.fromEntries(named.map((player) => [player.id, 0])));
    }
  }

  function bump(playerId: string, delta: number) {
    dialog?.editing();
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

      {finishingOrder&&!tournament&&<details className="disclosure"><summary>Add finishing order (optional)</summary><div className="space-y-3">{named.map(p=><label key={p.id} className="grid gap-1"><span>{p.name} · finishing position</span><input type="number" min={1} max={named.length} value={positions[p.id]||''} onChange={e=>{setPositions(v=>({...v,[p.id]:e.target.value}));setPositionsDirty(true);setDirty(true);}} /></label>)}{!positionsValid&&<p role="alert">Use distinct whole-number positions from 1 to {named.length}, or leave a position blank.</p>}</div></details>}
      {effective && canSave && (!correcting || dirty) && (
        <div className="result-review">
          <span>{correcting ? 'Recorded: '+previous+' → Proposed:' : 'Ready to record'}</span>
          <strong>{summary}{hasScore ? ` · ${scoreLabel}` : ''}</strong>
          {hasScore && !tournament && <p>{named.map((player) => `${player.name} ${games[player.id] || 0}`).join(' · ')}</p>}
          {correcting && (tournament || showGamesWon) && (
            <p className="subtle">{consequence||"Standings update immediately. Unstarted next-round pairings may change; started pairings stay fixed. Confirm places again after a finished-tournament correction."}</p>
          )}
        </div>
      )}
      {error && (
        <div>
          <p role="alert" className="text-destructive text-sm">{error}</p>
          <Button type="button" variant="ghost" onClick={async()=>{const current=await currentMatchResult(matchId);if(current)setConflict(current);else setError('Could not load the current result. Your proposed score is still here.');}}>Review current result</Button>
          {conflict&&<section className="panel"><h3>Current saved result</h3><p>{conflict.map(s=>(named.find(p=>p.id===s.profileId)?.name||'Player')+' '+(s.gamesWon??s.result??'Not reported')).join(' · ')}</p><p>Your proposal: {summary} {scoreLabel}</p><Button type="button" variant="outline" onClick={()=>{setExpected(conflict);setConflict(null);setError('');}}>Use this saved result as the correction baseline</Button></section>}

        </div>
      )}
      <Button
        type="button"
        className="save-result"
        disabled={pending || !canSave || !positionsValid || saved || (correcting && (!dirty||!changed))}
        onClick={async () => {
          setError('');
          const result = await run(() => reportMatch({
            matchId,
            draw: effective === 'draw',
            winnerIds: effective === 'draw' ? [] : effective?.split(',') || [],
            games: hasScore ? Object.fromEntries(named.map((player) => [player.id, games[player.id] || 0])) : undefined,
            decks: decks ? Object.fromEntries(named.map((player) => [player.id, decks[player.id] || null])) : undefined,
            finishOrder:positionsDirty?Array.from({length:named.length},(_,i)=>named.find(p=>Number(positions[p.id])===i+1)?.id||''):undefined,
            expected,
          }));
          if (!result.success) {
            setError(result.message || 'Result was not saved. Try again.');
            return;
          }
          setSaved(true);
          dialog?.saved();
          setDirty(false);
          if(returnTo&&!tournament){const id=returnTo.match(/^\/events\/([^/?]+)/)?.[1];if(id)sessionStorage.setItem('proxycon-result:'+id,matchId);}
          if (returnTo) router.push(returnTo);
        }}
      >
        {pending ? 'Saving…' : saved ? 'Result saved' : correcting ? 'Save correction' : 'Save result'}
      </Button>
    </div>
  );
}
