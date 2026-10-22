import Link from 'next/link';
import { Plus, ArrowUpRight, CalendarDays } from 'lucide-react';
import { eventDates } from '@/lib/display';
import { LiveRefresh } from '@/components/events/live-refresh';
import { createClient } from '@/utils/supabase/server';
import { getCurrentUser } from '@/lib/get-current-user';
import { joinEventById } from '@/app/weekend/actions';
import { ActButton } from '@/components/weekend/act-button';
import { LiveSlip } from '@/components/weekend/live-slip';
import { Button } from '@/components/ui/button';
import { NamePicker } from '@/components/who/name-picker';
import { LogoutButton } from '@/components/auth/logout-button';

export default async function HomePage() {
  const current = await getCurrentUser();
  const supabase = await createClient();
  if (!current?.user) {
    return <main className="page form-page"><h1 className="text-3xl">The phone session did not start.</h1><p className="subtle mt-4">Supabase is blocking phone sign-in. Open Authentication, then Providers, and turn on Anonymous. Reload this page after that.</p><Button asChild className="mt-6"><a href="https://supabase.com/dashboard/project/apnwvugvwlfopxtryjwk/auth/providers" target="_blank" rel="noreferrer">Open Anonymous sign-in settings</a></Button><Button asChild variant="outline" className="mt-3"><Link href="/login">Sign in with an account</Link></Button></main>;
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
    .eq('profile_id', playerId);
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
          ? `/tournament/${match.tournament_id}`
          : `/events/${match.event_id}/match/${match.id}`,
        kicker: match.table_label || (match.table_number ? `Table ${match.table_number}` : match.format_label || 'Game'),
        title: people.length ? people.join(', ') : 'Waiting on a seat',
        detail: match.tournament_id
          ? match.started_at ? `Round ${match.round_number} is live` : `Round ${match.round_number} pairings are posted`
          : 'Quick match',
      };
    })
    .sort((a, b) => Number(b.tournament) - Number(a.tournament));

  return (
    <main className="page"><LiveRefresh />
      <header className="page-heading"><div><p className="eyebrow">Your playgroup</p><h1>Events</h1><p className="subtle">{profile ? `Welcome back, ${profile.display_name}. Find your next table.` : 'House screen. Open a game and record it on the player who played.'}</p></div><div className="flex flex-wrap gap-2"><LogoutButton isGuest={current.user.is_anonymous} variant="outline" /><Button asChild><Link href="/events/new"><Plus size={16} className="mr-2" />Create event</Link></Button></div></header>
      {slips.length > 0 && <section className="stack" aria-label="Your live matches">{slips.map(slip => <LiveSlip key={slip.id} href={slip.href} kicker={slip.kicker} title={slip.title} detail={slip.detail} />)}</section>}
      <section><div className="section-heading"><h2>Your events</h2><span className="subtle">{(events || []).length} events</span></div>
       <div className="event-grid">{(events || []).map(event => {
         const mine = joined.has(event.id);
         return <article className="event-card" key={event.id}><div className="event-card-top"><span className={`status ${event.is_active !== false ? 'live' : ''}`}>{event.is_active === false ? 'Closed' : 'Open to join'}</span><h2><Link href={`/events/${event.id}`}>{event.name}</Link></h2></div><div className="event-card-body"><div><p className="subtle">{eventDates(event.start_date,event.end_date)}</p><span className="subtle">{mine ? 'You’re in the playgroup' : 'Join the playgroup to play'}</span></div>{mine ? <Button asChild variant="outline"><Link href={`/events/${event.id}`}>Open <ArrowUpRight size={15} className="ml-2" /></Link></Button> : <ActButton label="Join event" action={joinEventById.bind(null,event.id)} />}</div></article>;
       })}</div>
       {!(events || []).length && <div className="empty-state"><CalendarDays size={28} className="text-primary" /><h3>Your next game night starts here.</h3><p>Create an event, share it with your friends, then add a draft or a quick Commander game.</p><Button asChild><Link href="/events/new">Create your first event</Link></Button></div>}
      </section>
      <div className="panel flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl">Bring your favorite decks.</h2><p className="subtle mt-2">Save commanders once. Pick them again at your next table.</p></div><Button asChild variant="outline"><Link href="/decks">My decks <ArrowUpRight size={15} className="ml-2" /></Link></Button></div>
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
