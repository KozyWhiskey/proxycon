import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadEventBoard, matchPlayers } from '@/lib/event-board';
import { commanderKey } from '@/lib/weekend';
import { QuickMatchForm } from '@/components/weekend/quick-match-form';
import { PageIntro } from '@/components/layout/page-intro';

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ again?: string; mode?:string }>;
}) {
  const { id } = await params;
  const { again, mode } = await searchParams;
  const recording=mode === "record";
  const board = await loadEventBoard(id);
  if (!board) notFound();

  const previous = board.matches.find((match) => match.id === again && !match.tournament_id);
  const previousSeats = previous ? board.seats.filter((seat) => seat.match_id === previous.id) : [];
  const replay = previous
    ? {
        format: previous.game_type,
        profileIds: previousSeats.map((seat) => seat.profile_id).filter((value): value is string => Boolean(value)),
        deckIds: Object.fromEntries(previousSeats.filter((seat) => seat.profile_id && seat.deck_id).map((seat) => [seat.profile_id, seat.deck_id])),
        teams: Object.fromEntries(previousSeats.filter((seat) => seat.profile_id && seat.team).map((seat) => [seat.profile_id, seat.team])),
        customName: previous.game_type === 'custom' ? previous.format_label || '' : '',
      }
    : undefined;

  const recent = board.matches
    .filter((match) => !match.tournament_id && matchPlayersHaveResult(board, match.id))
    .slice(0, 5);

  return (
    <main className="page collection-page task-page">
      <Link href={`/events/${id}`} className="subtle">← {board.event.name}</Link>
      <PageIntro
        compact
        eyebrow="QUICK GAME"
        title={recording?"Record a finished game":"Start a game"}
        description={recording?"Choose the group and record who won.":"Choose a format and players. Add commanders now or at the table."}
      />
      {board.canManage ? (
        <section className="panel">
          <QuickMatchForm
            key={(previous?.id || "new")+(recording?"record":"start")}
            mode={recording?"record":"start"} startDate={board.event.start_date} endDate={board.event.end_date}
            eventId={id}
            people={board.members.map((member) => ({ id: member.id, name: member.name }))}
            decks={board.decks.map((deck) => ({
              id: deck.id,
              ownerId: deck.owner_id,
              name: deck.name,
              commanders: commanderKey(deck.commander_name, deck.partner_name) === 'No commander' ? '' : commanderKey(deck.commander_name, deck.partner_name),
            }))}
            replay={replay ? {...replay,profileIds:replay.profileIds.filter(id=>board.members.some(p=>p.id===id)),deckIds:Object.fromEntries(Object.entries(replay.deckIds).filter(([id,deck])=>board.decks.some(d=>d.id===deck&&d.owner_id===id)).map(([id,deck])=>[id,String(deck)])),issues:[...replay.profileIds.filter(id=>!board.members.some(p=>p.id===id)).map(()=>"A player is no longer in this event. Choose their replacement."),...Object.entries(replay.deckIds).filter(([id,deck])=>!board.decks.some(d=>d.id===deck&&d.owner_id===id)).map(()=>"A deck is no longer available. Choose another or leave it unrecorded.")]}:undefined}
          />
        </section>
      ) : (
        <p className="text-muted-foreground">Join the event before starting a game.</p>
      )}
      {recent.length > 0 && (
        <section className="recent-pods" aria-label="Play a recent game again">
          <h2 className="text-sm font-semibold text-muted-foreground mb-1 w-full">Play again</h2>
          {recent.map((match) => {
            const names = matchPlayers(board, match.id).map((player) => player.name).join(' · ');
            return (
              <Link key={match.id} href={`/events/${id}/play?again=${match.id}`} className="text-sm text-link">
                {match.format_label || match.game_type}
                {names ? ` · ${names}` : ''}
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}

function matchPlayersHaveResult(board: NonNullable<Awaited<ReturnType<typeof loadEventBoard>>>, matchId: string) {
  const seats = board.seats.filter((seat) => seat.match_id === matchId);
  return seats.length > 0 && seats.every((seat) => seat.result);
}
