import { withLiveSnapshot } from '@/lib/live-page';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadEventBoard } from '@/lib/event-board';
import { NewTournamentForm } from '@/components/weekend/new-tournament-form';
import { joinEventById } from '@/app/weekend/actions';
import { ActButton } from '@/components/weekend/act-button';
import { PageIntro } from '@/components/layout/page-intro';

async function NewTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const board = await loadEventBoard(id);
  if (!board) notFound();

  return (
    <main className="page collection-page task-page">
      <Link href={`/events/${id}`} className="subtle">
        ← {board.event.name}
      </Link>
      <PageIntro
        compact
        eyebrow="TOURNAMENT SETUP"
        title="Create tournament"
        description="Choose the format and rounds. Players and seating come next."
      />
      <section className="panel">
        {board.canManage ? (
          <NewTournamentForm eventId={id} house={board.house} />
        ) : (
          <>
            <p className="subtle mb-4">Join this event to create a tournament.</p>
            <ActButton label="Join event" action={joinEventById.bind(null, id)} />
          </>
        )}
      </section>
    </main>
  );
}

export default withLiveSnapshot(NewTournamentPage);
