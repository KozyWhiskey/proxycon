import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { notFound } from 'next/navigation';
import { loadEventBoard, matchPlayers } from '@/lib/event-board';
import { roundName, resultText } from '@/lib/weekend-view';
import { isCommanderFormat, isTeamFormat } from '@/lib/weekend';
import { PageIntro } from '@/components/layout/page-intro';
export default async function Page({ params, searchParams }: {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<Record<string, string | undefined>>;
}) {
    const { id } = await params;
    const q = await searchParams;
    const b = await loadEventBoard(id);
    if (!b)
        notFound();
    const day = q.day || 'all', player = q.player || 'all', format = q.format || 'all', tournament = q.tournament || 'all', search = (q.q || '').trim().toLowerCase();
    const completed = b.matches.filter(m => { const p = matchPlayers(b, m.id); return p.length && p.every(p => p.result); }).sort((a, b) => (b.completed_at || b.created_at).localeCompare(a.completed_at || a.created_at) || b.id.localeCompare(a.id));
    const rows = completed.filter(m => { const p = matchPlayers(b, m.id); const title = b.tournaments.find(t => t.id === m.tournament_id)?.name || m.format_label || m.game_type; return (day === 'all' || (m.played_on || m.created_at.slice(0, 10)) === day) && (player === 'all' || p.some(p => p.profile_id === player)) && (tournament === 'all' || m.tournament_id === tournament) && (format === 'all' || (format === 'tournament' ? m.tournament_id : !m.tournament_id && (format === 'commander' ? isCommanderFormat(m.game_type) : format === 'team' ? isTeamFormat(m.game_type) : !isCommanderFormat(m.game_type) && !isTeamFormat(m.game_type)))) && (!search || (title + ' ' + p.map(p => p.name).join(' ')).toLowerCase().includes(search)); });
    const limit = Math.max(20, Math.min(1000, Number(q.limit) || 20));
    const qs = new URLSearchParams(Object.entries(q).filter((e): e is [
        string,
        string
    ] => Boolean(e[1])));
    const from = '/events/' + id + '/history?' + qs;
    qs.set('limit', String(limit + 20));
    return <main className="page collection-page"><Link href={'/events/' + id}>← {b.event.name}</Link><PageIntro title="Game history" description="Find results from this event."/><form method="get" className="panel history-filters"><label>Search<InputLike name="q" value={q.q || ''}/></label>{[['day', 'Day', [['all', 'All days'], ...[...new Set(completed.map(m => m.played_on || m.created_at.slice(0, 10)))].sort().map(d => [d, d])]], ['player', 'Player', [['all', 'Everyone'], ...b.members.map(m => [m.id, m.name])]], ['format', 'Format', [['all', 'All formats'], ['commander', 'Commander'], ['tournament', 'Tournament matches'], ['team', 'Team games'], ['other', 'Other games']]], ['tournament', 'Tournament', [['all', 'All tournaments'], ...b.tournaments.map(t => [t.id, t.name])]]].map(([key, label, options]) => <label key={String(key)}>{String(label)}<select className="input" name={String(key)} defaultValue={q[String(key)] || 'all'}>{(options as string[][]).map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></label>)}<Button>Apply filters</Button><Link href={'/events/' + id + '/history'}>Clear filters</Link></form><p className="subtle">{rows.length} results · newest first</p><section>{rows.slice(0, limit).map(m => { const p = matchPlayers(b, m.id); const href = m.tournament_id ? '/tournament/' + m.tournament_id + '/match/' + m.id : '/events/' + id + '/match/' + m.id; return <Link className="panel history-result" href={href + '?from=' + encodeURIComponent(from)} key={m.id}><small>{m.played_on || m.created_at.slice(0, 10)} · {m.tournament_id ? (b.tournaments.find(t => t.id === m.tournament_id)?.name || 'Tournament') + ' · ' + roundName(m) : m.format_label || m.game_type}</small><strong>{resultText(p, Boolean(m.tournament_id))}</strong><span>{p.map(p => p.name).join(' · ')} · {b.canManage && p.length > 1 ? 'View / correct result' : 'View result'} →</span></Link>; })}{!rows.length && <p>No results match these filters.</p>}</section>{rows.length > limit && <Button asChild variant="outline"><Link scroll={false} href={'/events/' + id + '/history?' + qs}>Load more</Link></Button>}</main>;
}
function InputLike({ name, value }: {
    name: string;
    value: string;
}) { return <input className="input" name={name} defaultValue={value} type="search"/>; }
