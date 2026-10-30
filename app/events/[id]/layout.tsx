import { EventFrame } from '@/components/events/event-frame';
import { loadEventShell } from '@/lib/event-shell';
import { unstable_rethrow } from 'next/navigation';
export default async function EventLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  let board = null;
  try {
    board = await loadEventShell(id);
  } catch (error) {
    unstable_rethrow(error);
  }
  return <EventFrame eventId={id} context={board && { fetchedAt: board.fetchedAt, userId: board.userId, house: board.house, event: board.event }}>{children}</EventFrame>;
}
