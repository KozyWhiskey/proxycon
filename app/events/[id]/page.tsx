import { notFound } from 'next/navigation';
import { loadEventBoard } from '@/lib/event-board';
import { EventOverview } from '@/components/events/event-overview';
export default async function EventPage({ params }: { params: Promise<{id:string}> }) {
 const {id}=await params;
 const board=await loadEventBoard(id);
 if(!board) notFound();
 return <EventOverview board={board} />;
}
