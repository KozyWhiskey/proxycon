import {RememberEvent} from '@/components/events/remember-event';
import { EventNav } from '@/components/events/event-nav';
import { loadEventBoard } from '@/lib/event-board';
export default async function EventLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const board = await loadEventBoard(id);
  return <>{board&&(board.userId||board.house)&&<RememberEvent eventId={id} identity={board.house?'house':board.userId||'unbound'}/>}<EventNav id={id} house={board?.house} name={board?.event.name} />{children}</>;
}
