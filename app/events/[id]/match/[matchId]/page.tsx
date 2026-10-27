import {safeNext} from '@/lib/continuation';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { loadEventBoard, matchPlayers } from '@/lib/event-board';
import { commanderKey, isCommanderFormat } from '@/lib/weekend';
import { deleteQuickMatch } from '@/app/weekend/actions';
import { ActButton } from '@/components/weekend/act-button';
import { QuickMatchTable } from '@/components/weekend/quick-match-table';
import { Button } from '@/components/ui/button';
import { GameStatus } from '@/components/events/arena-ui';
import { Trophy } from 'lucide-react';

export default async function QuickMatchPage({
  params,searchParams,
}: {
  params: Promise<{ id: string; matchId: string }>;
  searchParams:Promise<{from?:string}>;
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
  const from=safeNext((await searchParams).from);const back=from.startsWith(eventHref+'/history')?from:null;
  const draw = finished && players.every((player) => player.result === 'draw');
  const winners = players.filter((player) => player.result === 'win').map((player) => player.name);
  const resultLine = draw
    ? 'Draw'
    : winners.length
      ? `${winners.join(' & ')} won`
      : 'Result recorded';

  return (
    <main className={`page form-page arena-match-detail task-page${finished ? ' is-complete' : ' is-playing'}`}>
      <Link href={back||eventHref} className="subtle">← {back?'Game history':board.event.name}</Link>
      <header className="match-page-head">
        <p className="eyebrow">{finished ? 'Result' : 'Live table'}</p>
        <h1>{title}</h1>
        <p className="subtle mt-2">
          {players.map((player) => player.name).join(' · ') || 'Waiting on seats'}
        </p>
        <div className="match-state">
          <GameStatus state={finished ? 'complete' : 'live'}>{finished ? 'Result recorded' : 'In progress'}</GameStatus>
        </div>
      </header>

      {finished && (
        <section className="match-victory" aria-label="Result">
          <Trophy size={22} aria-hidden="true" />
          <div>
            <h2>{resultLine}</h2>
          </div>
        </section>
      )}

      <section className="panel space-y-6">
        <QuickMatchTable
          matchId={match.id}
          teams={teams}
          commander={isCommanderFormat(match.game_type)}
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
            finishOrder:player.finish_order,
            deckId: player.deck_id,
            color: board.members.find((member) => member.id === player.profile_id)?.color || null,
          }))}
        />

        {!board.canManage && (
          <p className="subtle">Join the event to report a result for this table.</p>
        )}

        <div className="flex flex-wrap gap-3">{finished && <Link className="text-link" href={eventHref}>Back to event</Link>}
          {finished && (
            <Button asChild>
              <Link href={`/events/${id}/play?again=${match.id}`}>Play again with this group</Link>
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
