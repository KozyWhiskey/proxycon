import Link from 'next/link';
import { Plus, ArrowUpRight, Monitor, Swords, Layers, ArrowRight, Users, Check, Trophy } from 'lucide-react';
import { type EventBoard, currentRound, matchPlayers, myOpenMatches, standingsFor } from '@/lib/event-board';
import { tournamentLabel, isCommanderFormat } from '@/lib/weekend';
import { eventDates } from '@/lib/display';
import { joinEventById } from '@/app/weekend/actions';
import { ActButton } from '@/components/weekend/act-button';
import { LiveSlip } from '@/components/weekend/live-slip';
import { Button } from '@/components/ui/button';
import { PlayerAvatar, GameStatus, DeckArt } from './arena-ui';
import { ManaDivider } from '@/components/ui/mana-identity';

export function EventOverview({ board }: { board: EventBoard }) {
  const id = board.event.id;
  const open = myOpenMatches(board).sort((a, b) => Number(Boolean(b.tournament_id)) - Number(Boolean(a.tournament_id)));
  const tournaments = board.tournaments.filter(t => ['set_draft', 'chaos_draft', 'cube', 'sealed', 'draft'].includes(t.format));
  const live = tournaments.filter(t => t.status !== 'completed' && t.field_locked);
  const setup = tournaments.filter(t => t.status !== 'completed' && !t.field_locked);
  const finished = tournaments.filter(t => t.status === 'completed');
  const completed = board.matches.filter(m => { const p = matchPlayers(board, m.id); return p.length && p.every(s => s.result); }).sort((a, b) => (b.completed_at || b.created_at || '').localeCompare(a.completed_at || a.created_at || ''));
  const quick = board.matches.filter(m => !m.tournament_id && !m.completed_at && !completed.some(c => c.id === m.id));
  function record(tournament: boolean) {
    const ids = new Set(board.matches.filter(m => tournament ? Boolean(m.tournament_id) : !m.tournament_id && isCommanderFormat(m.game_type)).map(m => m.id));
    const results = board.seats.filter(p => p.profile_id === board.userId && p.result && ids.has(p.match_id));
    return ['win', 'loss', 'draw'].map(r => results.filter(p => p.result === r).length).join('–');
  }
  function tournamentCard(t: EventBoard['tournaments'][number]) {
    const round = currentRound(board, t.id);
    const recorded = round.matches.filter(m => { const p = matchPlayers(board, m.id); return p.length && p.every(s => s.result); }).length;
    const players = board.roster.filter(p => p.tournament_id === t.id && p.profile_id && !p.dropped);
    const state = t.status === 'completed' ? 'complete' : t.field_locked ? 'live' : 'setup';
    const winner = state === 'complete' ? standingsFor(board, t.id).find(p => p.place === 1) : null;
    return <Link key={t.id} href={board.house ? `/events/${id}/room?tournament=${t.id}` : `/tournament/${t.id}`} className={`arena-tournament is-${state}`}>
      <div className="arena-card-top"><span className="arena-format"><Layers size={14} />{tournamentLabel(t.format)}</span><GameStatus state={state}>{state === 'complete' ? 'Completed' : round.round ? `Round ${round.round} / ${t.max_rounds}` : 'Joining & seating'}</GameStatus></div>
      <h3>{t.name}</h3><div className="arena-card-bottom"><div className="avatar-pack">{players.slice(0, 4).map(p => { const m = board.members.find(m => m.id === p.profile_id); return <PlayerAvatar key={p.id} name={m?.name || 'Player'} color={m?.color} small />; })}<span>{players.length} players</span></div><ArrowUpRight size={20} /></div>
      {state === 'live' && <div className="tournament-progress"><div className="arena-meter" role="progressbar" aria-label="Round results reported" aria-valuenow={recorded} aria-valuemin={0} aria-valuemax={Math.max(1, round.matches.length)}><span style={{ width: `${round.matches.length ? recorded / round.matches.length * 100 : 0}%` }} /></div><span>{recorded} / {round.matches.length} results in</span></div>}
      {state === 'setup' && <p className="arena-caption">{t.max_rounds} rounds · {t.round_duration_minutes || 50} minute clock · Joining · {players.length} seated</p>}{winner && <p className="arena-winner"><Trophy size={14} />{winner.name} won</p>}
    </Link>;
  }
  return <main className={`page event-overview arena-hub${open.length ? ' has-personal-games' : ''}`}>
    <header className="arena-event-header"><div><ManaDivider /><p className="eyebrow">THE PLAYGROUP / {eventDates(board.event.start_date, board.event.end_date)}</p><h1>{board.event.name}</h1><div className="arena-event-meta"><span><Users size={14} />{board.members.length} players</span><span><Swords size={14} />{live.length + quick.length} live games</span><span><Check size={14} />{completed.length} results</span></div></div></header>
    {open.length > 0 && <section className="personal-games" aria-label="Your games">{open.map(match => {
      const opponents = matchPlayers(board, match.id).filter(p => p.profile_id !== board.userId);
      const mine = match.tournament_id ? standingsFor(board, match.tournament_id).find(p => p.profileId === board.userId) : null;
      return <LiveSlip key={match.id} href={match.tournament_id ? `/tournament/${match.tournament_id}/match/${match.id}` : `/events/${id}/match/${match.id}`} kicker={opponents.length ? match.table_label || (match.table_number ? `Table ${match.table_number}` : match.format_label || 'Quick match') : 'Bye'} title={opponents.length ? opponents.map(p => p.name).join(' / ') : 'You have the bye'} detail={match.tournament_id ? `Round ${match.round_number} · ${match.started_at ? 'In progress' : 'Pairings posted · Not started'}` : 'Quick game · In progress'} record={mine ? `${mine.points} points · ${mine.wins}–${mine.losses}–${mine.draws}` : undefined} actionLabel={match.started_at ? 'Report result' : 'View match'} />;
    })}</section>}
    {board.joined && <section className="weekend-record-strip" aria-label="Your event record"><div><span>Commander</span><strong>{record(false)}</strong></div><div><span>Tournament matches</span><strong>{record(true)}</strong></div><Link href={`/events/${id}/stats#player-${board.userId}`}>Your statistics <ArrowUpRight size={15} /></Link><small>Wins / losses / draws · This event</small></section>}
    <div className="event-actions hub-quick-actions">{board.canManage ? <><Button asChild><Link href={`/events/${id}/play`}><Plus size={17} />Start a game</Link></Button><Button variant="outline" asChild><Link href={`/events/${id}/tournaments/new`}><Layers size={16} />Create tournament</Link></Button></> : <ActButton label="Join event to play" action={joinEventById.bind(null, id)} />}</div>
    <div className="arena-hub-grid"><div className="stack">
      <section><div className="arena-section-title"><h2><Swords size={18} />At the tables</h2><GameStatus state="live">{live.length + quick.length} live</GameStatus></div><div className="arena-live-grid">{live.map(tournamentCard)}{quick.map(m => {
        const players = matchPlayers(board, m.id);
        return <Link key={m.id} href={`/events/${id}/match/${m.id}`} className="arena-quick"><div className="arena-card-top"><span className="arena-format">{m.format_label || m.game_type}</span><GameStatus state="live">In progress</GameStatus></div><div className="quick-players">{players.map(p => { const deck = board.decks.find(d => d.id === p.deck_id); return <div key={p.id}><DeckArt src={deck?.image_url} name={deck?.commander_name || p.name} /><span><strong>{p.name}</strong><small>{deck?.commander_name || 'Deck not set'}</small></span></div>; })}</div><div className="arena-card-bottom"><span className="arena-caption">{players.length}-player game</span><span className="arena-text-action">Open game <ArrowUpRight size={16} /></span></div></Link>;
      })}</div>{!live.length && !quick.length && <div className="arena-empty"><Swords size={30} /><h3>No live games.</h3><p>Start a Commander game or open a draft when you’re ready.</p>{board.canManage && <Link href={`/events/${id}/play`}>Start a game <ArrowRight size={16} /></Link>}</div>}</section>
      {setup.length > 0 && <section><div className="arena-section-title"><h2><Layers size={18} />On deck</h2><span className="arena-caption">{setup.length} in setup</span></div><div className="arena-setup-grid">{setup.map(tournamentCard)}</div></section>}
      <section className="arena-results"><div className="arena-section-title"><h2><Check size={18} />The latest results</h2><Link href={`/events/${id}/stats`}>All statistics <ArrowUpRight size={14} /></Link></div>{completed.slice(0, 5).map(m => {
        const p = matchPlayers(board, m.id); const bye = p.length === 1; const draw = p.every(p => p.result === 'draw');
        return <Link href={m.tournament_id ? `/tournament/${m.tournament_id}/match/${m.id}` : `/events/${id}/match/${m.id}`} className="arena-result-row" key={m.id}><span className="result-check"><Check size={16} /></span><div><strong>{bye ? `${p[0].name} received a bye` : draw ? 'Game drawn' : `${p.filter(p => p.result === 'win').map(p => p.name).join(' & ')} won`}</strong><small>{m.tournament_id ? `${tournaments.find(t => t.id === m.tournament_id)?.name || 'Tournament'} · Round ${m.round_number}` : m.format_label || m.game_type} · {p.map(p => p.name).join(', ')}</small></div><span className="arena-result-score">{m.tournament_id && p.length === 2 && p.some(p => p.games_won) ? p.map(p => p.games_won || 0).join('–') : <GameStatus state="complete">Final</GameStatus>}</span><ArrowUpRight size={14} /></Link>;
      })}{!completed.length && <p className="subtle">No results yet.</p>}</section>
      {finished.length > 0 && <details className="disclosure"><summary>Completed tournaments · {finished.length}</summary><div className="arena-setup-grid">{finished.map(tournamentCard)}</div></details>}
    </div><aside className="stack">
      <Link className="arena-room-entry" href={`/events/${id}/room`}><Monitor size={26} /><span className="eyebrow">House screen</span><h3>Take a seat.<br />Run the room.</h3><p>Pairings, standings, and the round clock. All in one place.</p><span>Open tournament room <ArrowUpRight size={17} /></span></Link>
      <section className="arena-members"><div className="arena-section-title"><h2>The playgroup</h2><span className="arena-caption">{board.members.length}</span></div>{board.members.map(m => <Link className="arena-member" href={`/players/${m.id}`} key={m.id}><PlayerAvatar name={m.name} color={m.color} small /><span>{m.name}{m.id === board.userId && <small>You</small>}</span><ArrowUpRight size={13} /></Link>)}<Link href={`/events/${id}/players`} className="arena-text-action">Players & invites <ArrowRight size={15} /></Link></section>
    </aside></div>
  </main>;
}
