import Link from 'next/link';
import { Plus, ArrowUpRight, Monitor } from 'lucide-react';
import { type EventBoard, matchPlayers, myOpenMatches } from '@/lib/event-board';
import { tournamentLabel, isCommanderFormat } from '@/lib/weekend';
import { eventDates } from '@/lib/display';
import { joinEventById } from '@/app/weekend/actions';
import { ActButton } from '@/components/weekend/act-button';
import { LiveSlip } from '@/components/weekend/live-slip';
import { Button } from '@/components/ui/button';

export function EventOverview({ board }: { board: EventBoard }) {
 const id = board.event.id;
 const open = myOpenMatches(board).sort((a,b) => Number(Boolean(b.tournament_id)) - Number(Boolean(a.tournament_id)));
 const tournaments = board.tournaments.filter(t => ['set_draft','chaos_draft','cube','sealed','draft'].includes(t.format));
 const completed = board.matches.filter(m => { const people = matchPlayers(board,m.id); return people.length && people.every(p => p.result); });
 const quick = board.matches.filter(m => !m.tournament_id && !m.completed_at);
 const myResults = board.seats.filter(p => p.profile_id === board.userId && p.result);
 const record = (tournament: boolean) => {
  const ids = new Set(board.matches.filter(m => tournament ? Boolean(m.tournament_id) : !m.tournament_id && isCommanderFormat(m.game_type)).map(m => m.id));
  const results = myResults.filter(p => ids.has(p.match_id));
  return { wins:results.filter(p => p.result === 'win').length, losses:results.filter(p => p.result === 'loss').length, draws:results.filter(p => p.result === 'draw').length };
 };
 return <main className="page">
  <header className="page-heading"><div><p className="eyebrow">The playgroup / {board.members.length} players</p><h1>{board.event.name}</h1><p className="subtle">{eventDates(board.event.start_date,board.event.end_date)}</p></div>
   {board.joined ? <Button asChild><Link href={`/events/${id}/play`}><Plus size={16} className="mr-2" />Quick match</Link></Button> : <ActButton label="Join event" action={joinEventById.bind(null,id)} />}
  </header>
  {open.length > 0 && <section className="stack" aria-label="Your live matches">{open.map(match => <LiveSlip key={match.id} href={match.tournament_id ? `/tournament/${match.tournament_id}` : `/events/${id}/match/${match.id}`} kicker={match.table_label || (match.table_number ? `Table ${match.table_number}` : match.format_label || 'Quick match')} title={matchPlayers(board,match.id).filter(p => p.profile_id !== board.userId).map(p => p.name).join(', ') || 'You have the bye'} detail={match.tournament_id ? `Round ${match.round_number} · ${match.started_at ? 'In progress' : 'Pairings posted'}` : 'Quick match · In progress'} />)}</section>}
  {board.joined && <section className="mobile-record" aria-label="Your record"><div className="section-heading"><h2>Your record</h2><Link href={`/events/${id}/stats#player-${board.userId}`}>Details <ArrowUpRight size={14} /></Link></div><div className="mobile-record-grid">{[false,true].map(t=>{const r=record(t);return <div key={String(t)}><span>{t ? 'Tournament' : 'Commander'}</span><strong>{r.wins}–{r.losses}–{r.draws}</strong><small>Wins · losses · draws</small></div>;})}</div></section>}
  <div className="event-columns"><div className="stack">
   <section className="panel"><div className="section-heading"><h2>Tournaments</h2>{board.joined && <Link href={`/events/${id}/tournaments/new`}><Plus size={14} />New tournament</Link>}</div>
    {tournaments.length ? tournaments.map(t => { const players = board.roster.filter(p => p.tournament_id === t.id && p.profile_id && !p.dropped); return <Link key={t.id} href={`/tournament/${t.id}`} className="tournament-card"><div className="tournament-meta"><span className="eyebrow" style={{margin:0}}>{tournamentLabel(t.format)}</span><span className={`status ${t.field_locked && t.status !== 'completed' ? 'live' : ''}`}>{t.status === 'completed' ? 'Finished' : t.field_locked ? 'Playing' : 'Joining & seating'}</span></div><h3>{t.name}</h3><div className="tournament-meta"><span className="subtle">{players.length} players · {t.max_rounds} rounds · {t.round_duration_minutes || 50} min</span><ArrowUpRight size={17} /></div></Link>; }) : <div className="empty-state"><h3>No tournaments yet</h3><p>Create a draft, cube, or sealed tournament. Players can join and choose seats before round one.</p>{board.joined && <Button asChild variant="outline"><Link href={`/events/${id}/tournaments/new`}>Create tournament</Link></Button>}</div>}
   </section>
   <section className="panel"><div className="section-heading"><h2>At the tables</h2>{board.joined && <Link href={`/events/${id}/play`}><Plus size={14} />Quick match</Link>}</div>
    {quick.length ? quick.map(m => <Link key={m.id} href={`/events/${id}/match/${m.id}`} className="game-row"><div><strong>{m.format_label || m.game_type}</strong><small>{matchPlayers(board,m.id).map(p=>p.name).join(' · ')}</small></div><span className="status live">Playing</span></Link>) : <p className="subtle">No quick matches in progress. Pick your pod and start a game.</p>}
   </section>
   <section className="panel"><div className="section-heading"><h2>Recent results</h2><Link href={`/events/${id}/stats`}>All statistics <ArrowUpRight size={14} /></Link></div>
    {completed.slice(0,6).map(m => { const players=matchPlayers(board,m.id); return <div className="game-row" key={m.id}><div><strong>{m.tournament_id ? tournaments.find(t=>t.id===m.tournament_id)?.name || 'Tournament' : m.format_label || m.game_type}</strong><small>{players.map(p=>p.name).join(' · ')}{m.played_on ? ` · ${m.played_on}` : ''}</small></div><span className="result-tag">{players.every(p=>p.result==='draw') ? 'Draw' : players.filter(p=>p.result==='win').map(p=>p.name).join(' & ') + ' won'}</span></div>; })}
    {!completed.length && <p className="subtle">Results will appear here after the first game.</p>}
   </section>
  </div><aside className="stack">
   {board.joined && <section className="panel desktop-record"><div className="section-heading"><h2>Your weekend</h2><Link href={`/events/${id}/stats#player-${board.userId}`}>Details <ArrowUpRight size={14} /></Link></div>{[false,true].map(t=>{ const r=record(t); return <div key={String(t)} style={{marginTop:20}}><p className="eyebrow">{t ? 'Tournament matches' : 'Commander'}</p><div className="record-grid"><div><strong>{r.wins}</strong><span>Wins</span></div><div><strong>{r.losses}</strong><span>Losses</span></div><div><strong>{r.draws}</strong><span>Draws</span></div></div></div>; })}</section>}
   <section className="panel"><div className="section-heading"><h2>The playgroup</h2><span className="subtle">{board.members.length}</span></div><div className="member-list">{board.members.map(m=><Link href={`/players/${m.id}`} className="member-chip" key={m.id}><span className="person-avatar">{m.name.slice(0,2).toUpperCase()}</span>{m.name}{m.id===board.userId ? ' (you)' : ''}</Link>)}</div>{!board.members.length && <p className="subtle">Join the event to take the first seat.</p>}<Link href={`/events/${id}/manage`} className="subtle inline-block mt-5">Invite a friend →</Link></section>
   <Link className="panel" href={`/events/${id}/room`}><Monitor size={22} className="text-primary mb-4" /><h3 className="text-xl">Put it on the big screen</h3><p className="subtle mt-2">One tournament at a time: seats, pairings, the round clock, and standings.</p></Link>
  </aside></div>
 </main>;
}
