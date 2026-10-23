import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadEventBoard } from '@/lib/event-board';
import { commanderKey } from '@/lib/weekend';
import { QuickMatchForm } from '@/components/weekend/quick-match-form';
import { PageIntro } from '@/components/layout/page-intro';

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ again?: string }>;
}) {
  const { id } = await params;
  const { again } = await searchParams;
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

  return (
    <main className="page collection-page task-page">
      <Link href={`/events/${id}`} className="subtle">← {board.event.name}</Link>
      <PageIntro compact eyebrow="QUICK GAME" title="Start a game" description="Choose a format and players. Add commanders now or at the table." />
      {board.canManage ? (
        <QuickMatchForm
          key={previous?.id || 'new'}
          eventId={id}
          people={board.members.map((member) => ({ id: member.id, name: member.name }))}
          decks={board.decks.map((deck) => ({
            id: deck.id,
            ownerId: deck.owner_id,
            name: deck.name,
            commanders: commanderKey(deck.commander_name, deck.partner_name) === 'No commander' ? '' : commanderKey(deck.commander_name, deck.partner_name),
          }))}
          replay={replay}
        />
      ) : (
        <p className="text-muted-foreground">Join the event before starting a game.</p>
      )}
      <section className="recent-pods" aria-label="Play a recent game again">{board.matches.filter((match) => !match.tournament_id && matchPlayersHaveResult(board, match.id)).slice(0, 5).map((match) => (
        <Link key={match.id} href={`/events/${id}/play?again=${match.id}`} className="text-sm text-link">
          Play again · {match.format_label || match.game_type}
        </Link>
      ))}</section>
    </main>
  );
}

function matchPlayersHaveResult(board: NonNullable<Awaited<ReturnType<typeof loadEventBoard>>>, matchId: string) {
  const seats = board.seats.filter((seat) => seat.match_id === matchId);
  return seats.length > 0 && seats.every((seat) => seat.result);
}
