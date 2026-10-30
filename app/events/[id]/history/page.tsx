import { withLiveSnapshot } from '@/lib/live-page';
import {displayDay} from '@/lib/display-day';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { notFound } from 'next/navigation';
import { matchPlayers } from '@/lib/event-board';
import { loadEventHistory, historyLimit } from '@/lib/event-history';
import { roundName, resultText } from '@/lib/weekend-view';
import { PageIntro } from '@/components/layout/page-intro';
async function Page({ params, searchParams }: {
    params: Promise<{
        id: string;
    }>;
    searchParams: Promise<Record<string, string | undefined>>;
}) {
    const { id } = await params;
    const q = await searchParams;
    const history = await loadEventHistory(id,q);
    if (!history)
        notFound();
    const b = history.board;
    const day = q.day || 'all', player = q.player || 'all', format = q.format || 'all', tournament = q.tournament || 'all';
    const rows = history.rows;
    const limit = historyLimit(q);
    const qs = new URLSearchParams(Object.entries(q).filter((e): e is [
        string,
        string
    ] => Boolean(e[1])));
    const from = '/events/' + id + '/history?' + qs;
    qs.set('limit', String(limit + 20));
    return <main className="page collection-page"><Link href={'/events/' + id}>← {b.event.name}</Link><PageIntro title="Game history" description="Find results from this event."/><form method="get" className="panel history-search"><div className="history-search-row"><label>Search<InputLike name="q" value={q.q || ''}/></label><Button>Search</Button></div><details><summary>Filters{[day,player,format,tournament].filter(v=>v!=='all').length?` · ${[day,player,format,tournament].filter(v=>v!=='all').length} active`:''}</summary><div className="history-filters">{[['day', 'Day', [['all', 'All days'], ...history.days.map(d => [d, displayDay(d)])]], ['player', 'Player', [['all', 'Everyone'], ...b.members.map(m => [m.id, m.name])]], ['format', 'Format', [['all', 'All formats'], ['commander', 'Commander'], ['tournament', 'Tournament matches'], ['team', 'Team games'], ['other', 'Other games']]], ['tournament', 'Tournament', [['all', 'All tournaments'], ...b.tournaments.map(t => [t.id, t.name])]]].map(([key, label, options]) => <label key={String(key)}>{String(label)}<select className="input" name={String(key)} defaultValue={q[String(key)] || 'all'}>{(options as string[][]).map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></label>)}</div><Button>Apply filters</Button></details><Link href={'/events/' + id + '/history'}>Clear filters</Link></form><div className="active-filter-chips">{day!=='all'&&<span>{displayDay(day)}</span>}{player!=='all'&&<span>{b.members.find(m=>m.id===player)?.name||'Player'}</span>}{format!=='all'&&<span>{format==='tournament'?'Tournament matches':format}</span>}{tournament!=='all'&&<span>{b.tournaments.find(t=>t.id===tournament)?.name||'Tournament'}</span>}</div><p className="subtle">{history.total} results · newest first</p><section>{rows.slice(0, limit).map(m => { const p = matchPlayers(b, m.id); const href = m.tournament_id ? '/tournament/' + m.tournament_id + '/match/' + m.id : '/events/' + id + '/match/' + m.id; return <Link id={'result-'+m.id} className="panel history-result" href={href + '?from=' + encodeURIComponent(from+'#result-'+m.id)} key={m.id}><small>{displayDay(m.played_on || m.created_at.slice(0, 10))} · {m.tournament_id ? (b.tournaments.find(t => t.id === m.tournament_id)?.name || 'Tournament') + ' · ' + roundName(m) : m.format_label || m.game_type}</small><strong>{resultText(p, Boolean(m.tournament_id))}</strong><span>{p.map(p => p.name).join(' · ')} · {b.canManage && p.length > 1 ? 'View / correct result' : 'View result'} →</span></Link>; })}{!rows.length && <p>No results match these filters.</p>}</section>{history.total > limit && <Button asChild variant="outline"><Link scroll={false} href={'/events/' + id + '/history?' + qs}>Load more</Link></Button>}</main>;
}
function InputLike({ name, value }: {
    name: string;
    value: string;
}) { return <input className="input" name={name} defaultValue={value} type="search"/>; }

export default withLiveSnapshot(Page);
