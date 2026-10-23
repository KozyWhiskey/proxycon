import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadEventBoard } from '@/lib/event-board';
import { getColorClass } from '@/lib/player-colors';

export default async function EventPlayersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const board = await loadEventBoard(id);
  if (!board) notFound();

  return (
    <main className="page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">{board.event.name}</p>
          <h1>Players</h1>
          <p className="subtle">Who is in this event. Decks and results stay on each player.</p>
        </div>
      </header>

      <section className="panel">
        <div className="section-heading">
          <h2>The playgroup</h2>
          <span className="subtle">{board.members.length}</span>
        </div>
        <div className="member-list">
          {board.members.map((member) => (
            <Link href={`/players/${member.id}`} className="member-chip" key={member.id}>
              <span className={`player-color ${getColorClass(member.color) || ''}`} aria-hidden />
              {member.name}{member.id === board.userId ? ' (you)' : ''}
            </Link>
          ))}
        </div>
        {!board.members.length && <p className="subtle">Add players to get the event started.</p>}
        {board.canManage && (
          <Link href={`/events/${id}/manage`} className="text-primary inline-block mt-5">
            Add players & invite friends →
          </Link>
        )}
      </section>
    </main>
  );
}
