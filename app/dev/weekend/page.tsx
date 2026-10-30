import { AgendaEditor } from '@/components/events/agenda-editor';
import { SessionHeader } from '@/components/layout/event-context';
import { EventNav } from '@/components/events/event-nav';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { weekendFixture } from '@/scripts/fixtures/weekend-preview';
import { EventOverview } from '@/components/events/event-overview';
import { TournamentRoom } from '@/components/events/tournament-room';
import { EventStatistics } from '@/components/events/event-statistics';
import { QuickMatchForm } from '@/components/weekend/quick-match-form';
import { RecapExport } from '@/components/events/recap-export';
import { makeRecap } from '@/lib/recap';
import { boardGames, boardPlaces } from '@/lib/weekend-view';
export default async function Page({ searchParams }: {
    searchParams: Promise<Record<string, string | undefined>>;
}) { if (process.env.NODE_ENV !== 'development' || process.env.WEEKEND_UX_PREVIEW !== 'true')
    notFound(); const q = await searchParams; const b = weekendFixture(q.state, Math.min(12, Math.max(6, Number(q.count) || 8))); const content = q.screen === 'agenda' ? <main className="page form-page"><h1>Weekend agenda</h1><AgendaEditor eventId={b.event.id} items={[]} members={b.members} tournaments={b.tournaments} canManage start={b.event.start_date} end={b.event.end_date}/></main> : q.screen === 'room' ? <TournamentRoom board={b}/> : q.screen === 'quick' ? <main className="page form-page task-page"><h1>Record a finished game</h1><QuickMatchForm eventId={b.event.id} mode="record" people={b.members} decks={[]}/></main> : q.screen === 'recap' ? <main className="page recap-page"><RecapExport snapshot={makeRecap(b)}/></main> : q.screen === 'stats' ? <Suspense fallback={<p>Loading…</p>}><EventStatistics preview event={b.event} members={b.members} games={boardGames(b)} places={boardPlaces(b)} tournaments={b.tournaments} decks={[]} matchTournaments={Object.fromEntries(b.matches.filter(m => m.tournament_id).map(m => [m.id, m.tournament_id!]))} userId={b.userId}/></Suspense> : <EventOverview board={b} preview/>; return <div className="app-shell"><SessionHeader eventMode name="Craig" house={false} isGuest/>{q.screen !== 'room' && <EventNav id={b.event.id} name={b.event.name}/>}<div className="app-content">{content}</div></div>; }
