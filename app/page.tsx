import Link from 'next/link';
import { Plus, ArrowUpRight, CalendarDays, Users } from 'lucide-react';
import { eventDates } from '@/lib/display';
import { createClient } from '@/utils/supabase/server';
import { getCurrentUser } from '@/lib/get-current-user';
import { joinEventById } from '@/app/weekend/actions';
import { ActButton } from '@/components/weekend/act-button';
import { LiveSlip } from '@/components/weekend/live-slip';
import { Button } from '@/components/ui/button';
import { NamePicker } from '@/components/who/name-picker';
import { PageIntro, FeaturePanel } from '@/components/layout/page-intro';
import { GameStatus } from '@/components/events/arena-ui';

export default async function HomePage() {
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
    return <NamePicker players={players} />;
  }
  const profile = current.profile;
  const playerId = profile?.id || '';

  const { data: events } = await supabase
    .from('events')
    .select('id, name, start_date, end_date, is_active')
    .order('start_date', { ascending: false });

  const { data: memberships } = await supabase
    .from('event_members')
    .select('event_id')
    .eq('profile_id', playerId || '00000000-0000-0000-0000-000000000000');
  const joined = new Set((memberships || []).map((row) => row.event_id));

  const { data: openSeats } = await supabase
    .from('match_participants')
    .select('match_id, result')
    .eq('profile_id', playerId)
    .is('result', null);
  const openIds = [...new Set((openSeats || []).map((seat) => seat.match_id).filter(Boolean))] as string[];
  const { data: openMatches } = openIds.length
    ? await supabase
      .from('matches')
      .select('id, event_id, tournament_id, table_label, table_number, game_type, format_label, round_number, started_at')
      .in('id', openIds)
    : { data: [] as OpenMatch[] };

  const matchIds = (openMatches || []).map((match) => match.id);
  const { data: opponents } = matchIds.length
    ? await supabase
      .from('match_participants')
      .select('match_id, profile_id, profile:profiles(display_name, username)')
      .in('match_id', matchIds)
    : { data: [] as OpponentRow[] };

  const slips = (openMatches || [])
    .map((match) => {
      const people = (opponents || [])
        .filter((seat) => seat.match_id === match.id && seat.profile_id !== playerId)
        .map((seat) => {
          const profile = Array.isArray(seat.profile) ? seat.profile[0] : seat.profile;
          return profile?.display_name || profile?.username || 'Opponent';
        });
      return {
        id: match.id,
        tournament: Boolean(match.tournament_id),
        href: match.tournament_id
          ? `/tournament/${match.tournament_id}/match/${match.id}`
          : `/events/${match.event_id}/match/${match.id}`,
        kicker: match.table_label || (match.table_number ? `Table ${match.table_number}` : match.format_label || 'Game'),
        title: people.length ? people.join(', ') : 'You have the bye',
        detail: match.tournament_id
          ? match.started_at ? `Round ${match.round_number} is live` : `Round ${match.round_number} pairings are posted`
          : 'Quick game · In progress',
        actionLabel: match.started_at ? 'Report result' : 'View match',
      };
    })
    .sort((a, b) => Number(b.tournament) - Number(a.tournament));

  return (
    <main className="page collection-page events-collection">
      <PageIntro compact={slips.length > 0} eyebrow="PROXYCON / THE PLAYGROUP" title={slips.length ? 'Your games' : <>Good games.<br /><em>Great company.</em></>} description={slips.length ? `Welcome back, ${profile?.display_name || 'player'}. Here’s where you’re playing.` : profile ? `Welcome back, ${profile.display_name}. Your next table is waiting.` : 'A night of Commander. A weekend of drafts. Bring everyone to the same table.'} actions={!slips.length && current.mode !== 'house' && <Button asChild><Link href="/events/new"><Plus size={16} />Create event</Link></Button>} />
      {slips.length > 0 && <section className="personal-games" aria-label="Your live matches">{slips.map(slip => <LiveSlip key={slip.id} href={slip.href} kicker={slip.kicker} title={slip.title} detail={slip.detail} actionLabel={slip.actionLabel} />)}</section>}
      {slips.length > 0 && current.mode !== 'house' && <div className="action-row"><Button asChild variant="outline"><Link href="/events/new"><Plus size={16} />Create event</Link></Button></div>}
      <section><div className="arena-section-title"><h2><CalendarDays size={18} />Your events</h2><span className="arena-caption">{(events || []).length} events · one playgroup</span></div>
       <div className="event-grid">{(events || []).map(event => {
         const mine = joined.has(event.id); const house = current.mode === 'house';
         const date = event.start_date ? new Date(`${event.start_date}T12:00:00Z`) : null;
         return <article className={`event-card event-pass${event.is_active === false ? ' is-past' : ''}`} key={event.id}><div className="event-card-top"><div className="event-pass-top"><GameStatus state={event.is_active === false ? 'complete' : 'setup'}>{event.is_active === false ? 'Closed' : 'Open to join'}</GameStatus>{date && <span className="event-date-stamp"><small>{date.toLocaleDateString('en-US', { month:'short', timeZone:'UTC' })}</small><strong>{date.getUTCDate()}</strong></span>}</div><h2><Link href={`/events/${event.id}`}>{event.name}</Link></h2><p className="arena-caption">{eventDates(event.start_date,event.end_date)}</p></div><div className="event-card-body"><span className="event-membership">{house ? 'The house screen is ready' : mine ? 'You’re on the guest list' : 'Room for another player'}</span>{mine || house ? <Button asChild variant="outline"><Link href={house ? `/events/${event.id}/room` : `/events/${event.id}`}>{house ? 'Open room' : 'Open event'} <ArrowUpRight size={15} /></Link></Button> : <ActButton label="Join event" action={joinEventById.bind(null,event.id)} />}</div></article>;
       })}</div>
       {!(events || []).length && <div className="empty-state"><CalendarDays size={28} className="text-primary" /><h3>Your next game night starts here.</h3><p>Create an event, share it with your friends, then add a draft or a quick Commander game.</p><Button asChild><Link href="/events/new">Create your first event</Link></Button></div>}
      </section>
      {current.mode !== 'house' && <div className="collection-footer-links"><FeaturePanel icon="decks" eyebrow="YOUR DECKBOX" title={<>Old favorites.<br />New rivals.</>} description="Keep your commanders ready. Pick a saved deck when you sit down to play." href="/decks" action="Open my decks" /><Link className="utility-link" href="/players"><Users size={23} /><span><strong>The playgroup</strong><small>Players and their commander collections</small></span><ArrowUpRight size={18} /></Link></div>}
    </main>
  );
}

interface OpenMatch {
  id: string;
  event_id: string | null;
  tournament_id: string | null;
  table_label: string | null;
  table_number: number | null;
  game_type: string;
  format_label: string | null;
  round_number: number | null;
  started_at: string | null;
}

interface OpponentRow {
  match_id: string;
  profile_id: string | null;
  profile: { display_name: string | null; username: string | null } | { display_name: string | null; username: string | null }[] | null;
}
