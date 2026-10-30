import { withLiveSnapshot } from '@/lib/live-page';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {loadCurrentBoard} from '@/lib/event-board';
import {PersonalGames} from '@/components/weekend/personal-games';
import {eventDateState,personalAssignments} from '@/lib/weekend-view';
import { safeNext } from '@/lib/continuation';
import { Plus, ArrowUpRight, CalendarDays, Users, Layers } from 'lucide-react';
import { eventDates } from '@/lib/display';
import { createClient } from '@/utils/supabase/server';
import { getCurrentUser } from '@/lib/get-current-user';
import { joinEventById } from '@/app/weekend/actions';
import { ActButton } from '@/components/weekend/act-button';
import { Button } from '@/components/ui/button';
import { NamePicker } from '@/components/who/name-picker';
import { PageIntro } from '@/components/layout/page-intro';
import { GameStatus } from '@/components/events/arena-ui';

async function HomePage({ searchParams, eventListOnly=false }: { searchParams: Promise<{ next?: string }>;eventListOnly?:boolean }) {
  const query = await searchParams;
  const current = await getCurrentUser();
  const supabase = await createClient();
  if (!current?.user) {
    return <main className="page form-page"><h1 className="text-3xl">Could not open the playgroup.</h1><p className="subtle mt-4">Try again in a moment, or sign in with your existing account.</p><Button asChild className="mt-6"><Link href="/">Try again</Link></Button><Button asChild variant="outline"><Link href="/login">Sign in with an account</Link></Button></main>;
  }
  if (!current.profile && current.mode !== 'house') {
    const { data: roster } = await supabase.from('profiles').select('id, display_name, color').eq('selectable', true).not('display_name', 'is', null).order('display_name');
    const players = (roster || []).flatMap((player) => {
      const name = player.display_name?.trim();
      return name ? [{ id: player.id, name, color: player.color }] : [];
    });
    return <NamePicker players={players} next={safeNext(query.next)} />;
  }
  const destination=safeNext(query.next,'');
  if(destination&&destination!=='/')redirect(destination);
  if(!eventListOnly){const {data:remembered}=await supabase.rpc('remembered_weekend_event');if(typeof remembered==='string'&&/^[0-9a-f-]{36}$/i.test(remembered)){const {data:event}=await supabase.from('events').select('id').eq('id',remembered).maybeSingle();if(event)redirect('/events/'+event.id+(current.mode==='house'?'/room':''));}}
  const profile = current.profile;
  const playerId = profile?.id || '';

  const [{ data: events }, { data: memberships }] = await Promise.all([supabase
    .from('events')
    .select('id, name, start_date, end_date, is_active')
    .order('start_date', { ascending: false }),

  supabase
    .from('event_members')
    .select('event_id')
    .eq('profile_id', playerId || '00000000-0000-0000-0000-000000000000')]);
  const joined = new Set((memberships || []).map((row) => row.event_id));

  const eventList = events || [];
  const boards=(await Promise.all(eventList.filter(e=>(joined.has(e.id)||current.mode==='house')&&e.is_active!==false).map(e=>loadCurrentBoard(e.id)))).filter(b=>b!==null);
  const slips=boards.flatMap(b=>personalAssignments(b)).filter(a=>a.inFlight);
  const houseMode=current.mode==='house';
  const hasEvents = eventList.length > 0;
  const emptyPlaygroup = !hasEvents;
  const playerName = profile?.display_name || 'player';
  const introTitle = emptyPlaygroup && !slips.length
    ? <>Good games.<br /><em>Great company.</em></>
    : boards.some(b=>personalAssignments(b).some(a=>a.inFlight))?'Your games':'Your events';
  const introDescription = slips.length
    ? `Welcome back, ${playerName}. Here’s where you’re playing.`
    : emptyPlaygroup
      ? (profile ? `Welcome back, ${profile.display_name}. Create an event when the group is ready.` : 'A night of Commander. A weekend of drafts. Bring everyone to the same table.')
      : `Welcome back, ${playerName}.`;
  const createIsPrimary = emptyPlaygroup && current.mode !== 'house';
  const createEvent = current.mode !== 'house'
    ? (
      <Button asChild variant={createIsPrimary ? 'default' : 'outline'}>
        <Link href="/events/new"><Plus size={16} />Create event</Link>
      </Button>
    )
    : null;
  let featuredId: string | null = null;
  for (const event of eventList) {
    if (event.is_active !== false && (joined.has(event.id) || current.mode === 'house')) {
      featuredId = event.id;
      break;
    }
  }

  return (
    <main className={`page collection-page events-collection${slips.length ? ' has-live-matches' : ''}`}>
      <PageIntro
        eyebrow="PROXYCON / THE PLAYGROUP"
        title={houseMode?'Choose an event':introTitle}
        description={houseMode?"Open a tournament room for the house.":introDescription}
        actions={createEvent && (!slips.length || createIsPrimary) ? createEvent : undefined}
      />
      {boards.map(board=><PersonalGames board={board} key={board.event.id}/>)}
      {slips.length > 0 && createEvent && <div className="action-row events-live-secondary">{createEvent}</div>}
      <section className="events-discovery">
        <div className="arena-section-title"><h2><CalendarDays size={18} />{houseMode?"Events":"Your events"}</h2></div>
        <div className="event-grid">{eventList.map(event => {
          const mine = joined.has(event.id);
          const house = current.mode === 'house';
          const past = event.is_active === false;
          const featured = event.id === featuredId;
          const date = event.start_date ? new Date(`${event.start_date}T12:00:00Z`) : null;
          const dateState=eventDateState(event);
          const status=<GameStatus state={dateState==='Closed'?'complete':dateState==='Happening now'?'live':'setup'}>{dateState}</GameStatus>;
          const membership = house ? 'House screen ready' : mine ? 'You’re in' : 'Not joined yet';
          return (
            <article className={`event-card event-pass${past ? ' is-past' : ''}${featured ? ' is-featured' : ''}`} key={event.id}>
              <div className="event-card-top">
                <div className="event-pass-top">
                  {status}
                  {date && <span className="event-date-stamp"><small>{date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}</small><strong>{date.getUTCDate()}</strong></span>}
                </div>
                <h2><Link href={`/events/${event.id}`}>{event.name}</Link></h2>
                <p className="arena-caption">{eventDates(event.start_date, event.end_date)}</p>
              </div>
              <div className="event-card-body">
                <span className="event-membership">{membership}{dateState==='Past dates'&&boards.some(b=>b.event.id===event.id&&b.matches.some(m=>!m.completed_at))?' · Games still open':''}</span>
                {mine || house
                  ? <Button asChild variant={featured ? 'default' : 'outline'}><Link href={house ? `/events/${event.id}/room` : `/events/${event.id}`}>{house ? 'Open room' : 'Open event'} <ArrowUpRight size={15} /></Link></Button>
                  : <ActButton label="Join event" action={joinEventById.bind(null, event.id)} />}
              </div>
            </article>
          );
        })}</div>
        {emptyPlaygroup && (
          <div className="empty-state">
            <CalendarDays size={28} className="text-primary" />
            <h3>No events yet.</h3>
            <p>Create an event, share it with your friends, then add a draft or a quick Commander game.</p>
            <Button asChild><Link href="/events/new">Create your first event</Link></Button>
          </div>
        )}
      </section>
      {current.mode !== 'house' && (
        <div className="collection-footer-links">
          <Link className="utility-link" href="/decks"><Layers size={23} /><span><strong>My decks</strong><small>Your commanders for the next game</small></span><ArrowUpRight size={18} /></Link>
          <Link className="utility-link" href="/players"><Users size={23} /><span><strong>The playgroup</strong><small>Players and their commander collections</small></span><ArrowUpRight size={18} /></Link>
        </div>
      )}
    </main>
  );
}

export default withLiveSnapshot(HomePage);
