import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadEventBoard } from '@/lib/event-board';
import { ManaIdentity } from '@/components/ui/mana-identity';

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
              <ManaIdentity color={member.color} />
              {member.name}{member.id === board.userId ? ' (you)' : ''}
            </Link>
          ))}
        </div>
        {!board.members.length && <p className="subtle">No one joined yet.</p>}
        {board.canManage && (
          <Link href={`/events/${id}/manage`} className="text-link inline-block mt-5">
            Add players & invite friends →
          </Link>
        )}
      </section>
    </main>
  );
}
