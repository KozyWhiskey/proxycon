import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadEventBoard } from '@/lib/event-board';
import { NewTournamentForm } from '@/components/weekend/new-tournament-form';
import { joinEventById } from '@/app/weekend/actions';
import { ActButton } from '@/components/weekend/act-button';
export default async function NewTournamentPage({ params }: { params: Promise<{ id: string }> }) {
 const {id}=await params; const board=await loadEventBoard(id); if(!board) notFound();
 return <main className="page form-page"><Link href={`/events/${id}`} className="subtle">← {board.event.name}</Link><header className="page-heading"><div><p className="eyebrow">Tournament setup</p><h1>Create tournament</h1><p className="subtle">Choose the format. Players and seats come next.</p></div></header><section className="panel">{board.joined ? <NewTournamentForm eventId={id} /> : <><p className="subtle mb-4">Join this event to create a tournament.</p><ActButton label="Join event" action={joinEventById.bind(null,id)} /></>}</section></main>;
}
