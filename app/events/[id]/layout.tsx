import { EventNav } from '@/components/events/event-nav';
import { loadEventBoard } from '@/lib/event-board';
export default async function EventLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const board = await loadEventBoard(id);
  return <><EventNav id={id} house={board?.house} name={board?.event.name} />{children}</>;
}
