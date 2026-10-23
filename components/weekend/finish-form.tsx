'use client';
import { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { finishTournament } from '@/app/weekend/actions';
import { Button } from '@/components/ui/button';
import { useAction } from '@/components/weekend/act-button';
interface Standing { id: string; name: string }

export function FinishForm({ tournamentId, ranked, tieGroups, prizes = [], early = false, finalResult = [] }: { tournamentId: string; ranked: Standing[]; tieGroups: string[][]; prizes?: (string | null)[]; early?: boolean; finalResult?: { id: string; result: string | null }[] }) {
  const { pending, run } = useAction();
  const [groups, setGroups] = useState(() => tieGroups.map(g => [...g]));
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const version = JSON.stringify({ ranked, tieGroups, prizes, finalResult });
  const [reviewedVersion, setReviewedVersion] = useState(version);
  if (version !== reviewedVersion) {
    setReviewedVersion(version); setGroups(tieGroups.map(g => [...g])); setConfirmed(false);
    setError('Standings changed. Review the places again before finishing.');
  }
  const currentGroups = version === reviewedVersion ? groups : tieGroups;
  const ordered = [...ranked];
  for (const group of currentGroups) {
    const indices = ordered.map((p, i) => group.includes(p.id) ? i : -1).filter(i => i >= 0);
    indices.forEach((index, i) => { ordered[index] = ranked.find(p => p.id === group[i])!; });
  }
  const finalWinner = finalResult.find(p => p.result === 'win');
  const finalLoser = finalResult.find(p => p.result === 'loss');
  if (finalWinner && finalLoser) {
    const winnerIndex = ordered.findIndex(p => p.id === finalWinner.id);
    const loserIndex = ordered.findIndex(p => p.id === finalLoser.id);
    if (winnerIndex > loserIndex && loserIndex >= 0) { const [winner] = ordered.splice(winnerIndex, 1); ordered.splice(loserIndex, 0, winner); }
  }
  return <div className="finish-review space-y-5">
    <p className="subtle">{early ? 'End this tournament early using the current standings. ' : ''}Review the places before finishing. Prizes are optional; everyone keeps their results.</p>
    {currentGroups.map((group, groupIndex) => <fieldset key={groupIndex} className="tie-order"><legend>Tied players · choose their order</legend><p className="subtle">The standings rules could not separate these players.</p>{group.map((id, i) => <div className="tie-row" key={id}><span>{i + 1}. {ranked.find(p => p.id === id)?.name}</span><div>{[-1, 1].map(delta => <Button key={delta} type="button" variant="outline" aria-label={`Move ${ranked.find(p => p.id === id)?.name} ${delta < 0 ? 'up' : 'down'}`} disabled={pending || i + delta < 0 || i + delta >= group.length} onClick={() => { setGroups(current => current.map((g, index) => { if (index !== groupIndex) return g; const next = [...g]; [next[i], next[i + delta]] = [next[i + delta], next[i]]; return next; })); setConfirmed(false); }}>{delta < 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}</Button>)}</div></div>)}</fieldset>)}
    <ol className="finish-places" aria-label="Final places preview">{ordered.map((p, i) => <li key={p.id}><span>{i + 1}</span><strong>{p.name}</strong>{prizes[i] && <small>{prizes[i]}</small>}</li>)}</ol>
    <label className="finish-confirm"><input type="checkbox" checked={confirmed} disabled={pending} onChange={e => setConfirmed(e.target.checked)} /><span>{currentGroups.length ? 'I have reviewed the tied order and final places.' : 'The final places are correct.'}</span></label>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <Button type="button" disabled={pending || !confirmed} onClick={async () => { setError(''); const result = await run(() => finishTournament({ tournamentId, order: ordered.map(p => p.id) })); if (!result.success) setError(result.message || 'Could not finish. Try again.'); }}>{pending ? 'Finishing…' : early ? 'End tournament with these places' : 'Finish tournament'}</Button>
  </div>;
}
