import { EventNav } from '@/components/events/event-nav';
import { LiveRefresh } from '@/components/events/live-refresh';
export default async function EventLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <><EventNav id={id} /><LiveRefresh />{children}</>;
}
