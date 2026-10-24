'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Flame, Trophy, Swords, Layers, Activity, Users, ChevronDown } from 'lucide-react';
import { buildEventStats, chicagoWeekday, commanderKey, isCommanderFormat, isTeamFormat, placeLabel, streakFor, type StatGame } from '@/lib/weekend';
import { PlayerAvatar, DeckArt, GameStatus } from './arena-ui';
import { ManaDivider } from '@/components/ui/mana-identity';

type Place = { tournamentId: string; profileId: string; place: number | null; points: number; wins: number; losses: number; draws: number };
type Props = {
  event: { id: string; name: string; start_date: string | null; end_date: string | null };
  members: { id: string; name: string; color: string | null }[];
  games: StatGame[];
  places: Place[];
  tournaments: { id: string; name: string; status: string }[];
  decks: { commander_name: string | null; partner_name: string | null; image_url?: string | null }[];
  matchTournaments: Record<string, string>;
};
type Format = 'commander' | 'tournament' | 'team' | 'other';
const formats: { id: Format; name: string }[] = [{ id: 'commander', name: 'Commander' }, { id: 'tournament', name: 'Tournament matches' }, { id: 'team', name: 'Team games' }, { id: 'other', name: 'Other games' }];
function inFormat(g: StatGame, format: Format) {
  if (format === 'tournament') return g.tournament;
  if (g.tournament) return false;
  if (format === 'commander') return isCommanderFormat(g.gameType);
  if (format === 'team') return isTeamFormat(g.gameType);
  return !isCommanderFormat(g.gameType) && !isTeamFormat(g.gameType);
}
function FormStrip({ games }: { games: StatGame[] }) {
  return <div className="form-strip" aria-label="Recent results, oldest to newest">{games.slice(-8).map(g => <span key={g.matchId} className={`form-${g.bye ? 'win' : g.result}`} title={`${g.playedOn}: ${g.bye ? 'bye (win)' : g.result}`}>{g.bye ? 'B' : g.result?.[0].toUpperCase()}</span>)}{!games.length && <small>No results yet</small>}</div>;
}
function winsLabel(count: number) {
  return `${count} win${count === 1 ? '' : 's'}`;
}

export function EventStatistics({ event, members, games, places, tournaments, decks, matchTournaments }: Props) {
  const [format, setFormat] = useState<Format>('commander');
  const [day, setDay] = useState('all');
  const [opponent, setOpponent] = useState('all');
  const fullStats = buildEventStats({ games, start: event.start_date, end: event.end_date, profiles: members.map(m => m.id), tournamentPlaces: places });
  const dayGames = games.filter(g => day === 'all' || g.playedOn === day);
  const selected = dayGames.filter(g => inFormat(g, format));
  const stats = buildEventStats({ games: dayGames, start: event.start_date, end: event.end_date, profiles: members.map(m => m.id), tournamentPlaces: [] });
  const ranked = members.map(m => {
    const results = selected.filter(g => g.profileId === m.id).sort((a, b) => a.playedOn.localeCompare(b.playedOn) || a.createdAt.localeCompare(b.createdAt));
    const wins = results.filter(g => g.result === 'win' || g.bye).length;
    return { ...m, results, wins, losses: results.filter(g => !g.bye && g.result === 'loss').length, draws: results.filter(g => !g.bye && g.result === 'draw').length, rate: results.length ? Math.round(wins / results.length * 100) : null, streak: streakFor(results.map(g => g.bye ? 'win' : g.result!).filter(Boolean)) };
  }).sort((a, b) => b.wins - a.wins || (b.rate || 0) - (a.rate || 0) || a.name.localeCompare(b.name));
  const streakLeader = [...ranked].sort((a, b) => b.streak.current - a.streak.current || b.streak.best - a.streak.best)[0];
  const maxWins = Math.max(1, ...ranked.map(p => p.wins));
  const gamesPlayed = new Set(selected.map(g => g.matchId)).size;
  const activePlayers = ranked.filter(p => p.results.length).length;
  const name = (id: string) => members.find(m => m.id === id)?.name || 'Player';
  const commanderRows = stats.commanderByCommander.filter(row => row.name !== 'No commander');
  const mostPlayed = [...ranked].sort((a, b) => b.results.length - a.results.length)[0];
  const scope = day === 'all' ? 'This event' : chicagoWeekday(day);
  return <main className="page arena-stats">
    <header className="arena-event-header"><div><ManaDivider /><p className="eyebrow">{event.name} / STATISTICS</p><h1>The weekend,<br /><em>in play.</em></h1></div><div className="stats-header-note"><Activity size={20} /><span>Event-only records.<small>{event.start_date} — {event.end_date}</small></span></div></header>
    <div className="stats-filter-bar"><div className="arena-tabs" aria-label="Statistics format">{formats.map(f => <button key={f.id} type="button" aria-pressed={format === f.id} onClick={() => setFormat(f.id)}>{f.name}</button>)}</div><label className="arena-day-picker">Day<select value={day} onChange={e => setDay(e.target.value)}><option value="all">Whole weekend</option>{fullStats.days.map(d => <option key={d} value={d}>{chicagoWeekday(d)} · {d}</option>)}</select></label></div>
    <section className="arena-stat-ticker" aria-label={`${scope} ${formats.find(f => f.id === format)?.name} totals`}><div><Swords size={17} /><strong>{gamesPlayed}</strong><span>{format === 'commander' ? 'pods completed' : 'matches completed'}</span></div><div><Users size={17} /><strong>{activePlayers}</strong><span>players in action</span></div><div><Activity size={17} /><strong>{mostPlayed?.results.length || 0}</strong><span>most played<small>{mostPlayed?.results.length ? mostPlayed.name : 'No results yet'}</small></span></div><div><Flame size={17} /><strong>{Math.max(0, ...ranked.map(p => p.streak.best))}</strong><span>best win streak</span></div></section>
    <div className="arena-stats-grid"><section className="arena-ranking"><div className="arena-section-title"><h2><Swords size={18} />{format === 'tournament' ? 'Tournament match wins' : format === 'commander' ? 'Commander wins' : format === 'team' ? 'Team wins' : 'Other game wins'}</h2><span className="arena-caption">{scope}</span></div><div className="ranking-labels"><span>Player</span><span>Wins / played</span></div>{ranked.filter(p => p.results.length > 0).map((p, i) => <Link className="ranking-row" href={`#player-${p.id}`} key={p.id}><span className="ranking-place">{String(i + 1).padStart(2, '0')}</span><PlayerAvatar name={p.name} color={p.color} small /><div className="ranking-name"><strong>{p.name}</strong><div className="ranking-track"><span style={{ width: `${p.wins / maxWins * 100}%` }} /></div></div><span className="ranking-value">{p.wins}<small> / {p.results.length}</small></span><span className="ranking-rate">{p.rate == null ? '—' : `${p.rate}%`}</span></Link>)}{gamesPlayed === 0 && <div className="stats-format-empty" role="status"><h3>No results yet</h3><p className="subtle">Completed {formats.find(f => f.id === format)?.name.toLowerCase()} will appear here{day !== 'all' ? ' for this day' : ' for this event'}.</p></div>}<p className="arena-caption ranking-footnote">Wins / completed results. Draws count as results, not wins.</p></section>
    <aside className="arena-stats-side"><section className="arena-streak"><div className="arena-section-title"><h2><Flame size={18} />On a streak</h2><span className="arena-caption">{scope}</span></div>{streakLeader && streakLeader.streak.current > 0 ? <><div className="streak-spotlight"><div><PlayerAvatar name={streakLeader.name} color={streakLeader.color} /><h3>{streakLeader.name}</h3><p>consecutive wins</p></div><strong>{streakLeader.streak.current}<span>WINS</span></strong></div><FormStrip games={streakLeader.results} /><div className="streak-footer"><span>Personal best</span><b>{winsLabel(streakLeader.streak.best)}</b></div></> : <div className="streak-empty"><Flame size={36} /><h3>No active streak</h3><p>Win streaks for this format show up here.</p></div>}</section>
    {format === 'commander' ? <section className="arena-commanders"><div className="arena-section-title"><h2><Layers size={18} />Winning commanders</h2></div>{commanderRows.slice(0, 4).map((c, i) => { const deck = decks.find(d => commanderKey(d.commander_name, d.partner_name) === c.name); const played = selected.filter(g => (g.commander || 'No commander') === c.name).length; return <div className="commander-rank" key={c.name}><DeckArt src={deck?.image_url} name={c.name} /><div><span className="arena-caption">{i === 0 ? 'MOST WINS' : `COMMANDER ${i + 1}`}</span><strong>{c.name}</strong><small>{winsLabel(c.wins)} · {c.losses} losses · {played} played</small></div><b>{c.wins}</b></div>; })}{!commanderRows.length && <p className="subtle">Commander results will appear here after a win or loss.</p>}</section> : <section className="arena-commanders"><div className="arena-section-title"><h2><Trophy size={18} />Tournament titles</h2><span className="arena-caption">Whole event</span></div>{tournaments.filter(t => t.status === 'completed').map(t => { const winner = places.find(p => p.tournamentId === t.id && p.place === 1); return <Link className="title-result" key={t.id} href={`/tournament/${t.id}`}><Trophy size={22} /><div><strong>{winner ? name(winner.profileId) : 'Places pending'}</strong><small>{t.name}</small></div><ArrowUpRight size={15} /></Link>; })}{!tournaments.some(t => t.status === 'completed') && <p className="subtle">No finished tournaments yet.</p>}</section>}</aside></div>
    <section><div className="arena-section-title"><h2><Users size={18} />The players</h2><span className="arena-caption">{scope} · {formats.find(f => f.id === format)?.name}</span></div><div className="arena-player-grid">{ranked.filter(p => p.results.length > 0).map(p => <article className="arena-player-card" id={`player-${p.id}`} key={p.id}><header><PlayerAvatar name={p.name} color={p.color} /><div><Link href={`/players/${p.id}`}><h3>{p.name}</h3></Link><span className="arena-caption">{p.results.length} played · {winsLabel(p.wins)}</span></div><div className="player-rate" style={{ '--rate': `${p.rate || 0}%` } as React.CSSProperties}><span>{p.rate == null ? '—' : `${p.rate}%`}</span></div></header><div className="player-record"><strong>{p.wins}<small>W</small> {p.losses}<small>L</small> {p.draws}<small>D</small></strong><span>Win streak <b>{p.streak.current}</b><small>Best {p.streak.best}</small></span></div><FormStrip games={p.results} /><details className="player-detail"><summary>Decks, results & places <ChevronDown size={14} /></summary><div>{format === 'commander' && [...new Set(p.results.map(g => g.commander || 'Deck not recorded'))].map(c => <p key={c}>{c} <b>{winsLabel(p.results.filter(g => (g.commander || 'Deck not recorded') === c && g.result === 'win').length)}</b></p>)}{p.results.slice(-5).reverse().map(g => <Link key={g.matchId} href={g.tournament ? `/tournament/${matchTournaments[g.matchId]}` : `/events/${event.id}/match/${g.matchId}`}>{g.playedOn}<span>{g.bye ? 'Bye' : g.result}</span></Link>)}<small>TOURNAMENTS · WHOLE EVENT</small>{places.filter(r => r.profileId === p.id).map(r => <Link key={r.tournamentId} href={`/tournament/${r.tournamentId}`}><span>{tournaments.find(t => t.id === r.tournamentId)?.name}</span><b>{r.place ? placeLabel(r.place) : `${r.points} pts`}</b></Link>)}</div></details></article>)}{ranked.every(p => p.results.length === 0) && <p className="subtle">No player cards for this format yet.</p>}</div><p className="arena-caption" style={{ marginTop: 12 }}>Recent form: W win · L loss · D draw · B bye. Oldest → newest. A draw ends a streak; tournament byes count as wins.</p></section>
    <section className="arena-headtohead"><div className="arena-section-title"><h2><Swords size={18} />Head to head</h2><label className="arena-day-picker">Player<select value={opponent} onChange={e => setOpponent(e.target.value)}><option value="all">Everyone</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label></div><p className="arena-caption">{scope} · Wins for the first player versus wins for the second. Formats stay separate.</p><div className="arena-table-wrap"><table><thead><tr><th>Players</th><th>Commander</th><th>Tournament matches</th></tr></thead><tbody>{stats.headToHead.filter(r => opponent === 'all' || r.a === opponent || r.b === opponent).map(r => <tr key={`${r.a}-${r.b}`}><td>{name(r.a)} <span className="arena-caption">vs</span> {name(r.b)}</td><td>{r.commander}</td><td>{r.tournament}</td></tr>)}</tbody></table></div>{!stats.headToHead.filter(r => opponent === 'all' || r.a === opponent || r.b === opponent).length && <p className="subtle">No decisive head-to-head results in this selection.</p>}</section>
    <section className="arena-tournament-recap"><div className="arena-section-title"><h2><Trophy size={18} />The tournament notebook</h2><span className="arena-caption">Whole event</span></div><div className="arena-setup-grid">{tournaments.filter(t => t.status === 'completed' || places.some(p => p.tournamentId === t.id && (p.points > 0 || p.place))).map(t => <details className="tournament-recap" key={t.id}><summary><span><Layers size={16} />{t.name}</span><GameStatus state={t.status === 'completed' ? 'complete' : 'setup'}>{t.status === 'completed' ? 'Final' : 'Standings'}</GameStatus></summary><div>{places.filter(p => p.tournamentId === t.id).sort((a, b) => (a.place || 999) - (b.place || 999) || b.points - a.points).map(p => <p key={p.profileId}><span>{p.place ? `${placeLabel(p.place)} · ` : ''}{name(p.profileId)}</span><b>{p.points} pts</b><small>{p.wins}–{p.losses}–{p.draws}</small></p>)}<Link className="arena-text-action" href={`/tournament/${t.id}`}>Open tournament <ArrowUpRight size={14} /></Link></div></details>)}{!tournaments.some(t => t.status === 'completed' || places.some(p => p.tournamentId === t.id && (p.points > 0 || p.place))) && <p className="subtle">No tournament standings yet.</p>}</div></section>
  </main>;
}


