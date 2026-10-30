import { withLiveSnapshot } from '@/lib/live-page';
import { notFound } from 'next/navigation';
import { loadEventBoard } from '@/lib/event-board';
import { EventOverview } from '@/components/events/event-overview';
async function EventPage({ params }: { params: Promise<{id:string}> }) {
 const {id}=await params;
 const board=await loadEventBoard(id);
 if(!board) notFound();
 return <EventOverview board={board} />;
}

export default withLiveSnapshot(EventPage);
