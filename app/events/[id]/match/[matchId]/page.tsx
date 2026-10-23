import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { loadEventBoard, matchPlayers } from '@/lib/event-board';
import { commanderKey } from '@/lib/weekend';
import { deleteQuickMatch } from '@/app/weekend/actions';
import { ActButton } from '@/components/weekend/act-button';
import { QuickMatchTable } from '@/components/weekend/quick-match-table';
import { Button } from '@/components/ui/button';
import { GameStatus } from '@/components/events/arena-ui';
import { Trophy, Swords } from 'lucide-react';

export default async function QuickMatchPage({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  const { id, matchId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(matchId).success) notFound();

  const board = await loadEventBoard(id);
  if (!board) notFound();

  const match = board.matches.find((row) => row.id === matchId);
  if (!match || match.tournament_id) notFound();

  const players = matchPlayers(board, match.id);
  const teams = players.some((player) => player.team);
  const finished = players.length > 0 && players.every((player) => player.result);
  const canReport = board.canManage && players.some((player) => player.profile_id);
  const canDelete = board.canManage && !finished;
  const title = match.table_label || match.format_label || 'Quick match';
  const eventHref = `/events/${id}`;

  return (
    <main className={`page form-page arena-match-detail${finished ? ' is-complete' : ' is-playing'}`}>
      <Link href={eventHref} className="subtle">← {board.event.name}</Link>
      <header className="page-heading">
        <div>
          <p className="eyebrow">{finished ? 'Result' : 'Live table'}</p>
          <h1>{title}</h1>
          <p className="subtle mt-2">
            {players.map((player) => player.name).join(' · ') || 'Waiting on seats'}
          </p>
          <GameStatus state={finished ? 'complete' : 'live'}>{finished ? 'Result recorded' : 'In progress'}</GameStatus>
        </div>
      </header>

      {finished && <section className="match-victory"><Trophy size={26} /><div><span className="eyebrow">THE RESULT</span><h2>{players.every(p => p.result === 'draw') ? 'A draw at the table.' : `${players.filter(p => p.result === 'win').map(p => p.name).join(' & ')} takes the win.`}</h2></div></section>}
      {!finished && <div className="match-live-line"><Swords size={17} /><span>The game is on. Report a winner when the table is ready.</span></div>}
      <section className="panel space-y-6">
        <QuickMatchTable
          matchId={match.id}
          teams={teams}
          finished={finished}
          canReport={canReport}
          returnTo={eventHref}
          decks={board.decks.map((deck) => ({
            id: deck.id,
            ownerId: deck.owner_id,
            name: deck.name,
            commanders: commanderKey(deck.commander_name, deck.partner_name) === 'No commander'
              ? ''
              : commanderKey(deck.commander_name, deck.partner_name),
            image: deck.image_url,
          }))}
          players={players.map((player) => ({
            id: player.id,
            profileId: player.profile_id,
            name: player.name,
            team: player.team,
            result: player.result,
            gamesWon: player.games_won,
            deckId: player.deck_id,
            color: board.members.find((member) => member.id === player.profile_id)?.color || null,
          }))}
        />

        {!board.canManage && (
          <p className="subtle">Join the event to report a result for this table.</p>
        )}

        <div className="flex flex-wrap gap-3">
          {finished && (
            <Button asChild>
              <Link href={eventHref}>Back to event</Link>
            </Button>
          )}
          {canDelete && <ActButton label="Delete game" variant="outline" returnTo={eventHref} action={deleteQuickMatch.bind(null, match.id)} />}
          {!finished && (
            <Button asChild variant="ghost">
              <Link href={eventHref}>Back to event</Link>
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}
