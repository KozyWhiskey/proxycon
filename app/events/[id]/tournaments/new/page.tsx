import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadEventBoard } from '@/lib/event-board';
import { NewTournamentForm } from '@/components/weekend/new-tournament-form';
import { joinEventById } from '@/app/weekend/actions';
import { ActButton } from '@/components/weekend/act-button';
import { PageIntro, FormIdentity } from '@/components/layout/page-intro';
export default async function NewTournamentPage({ params }: { params: Promise<{ id: string }> }) {
 const {id}=await params; const board=await loadEventBoard(id); if(!board) notFound();
 return <main className="page collection-page setup-page"><Link href={`/events/${id}`} className="subtle">← {board.event.name}</Link><PageIntro eyebrow="TOURNAMENT SETUP / THE NEXT DRAFT" title={<>Open the packs.<br /><em>Set the stage.</em></>} description="Set draft, chaos, cube, or sealed. Give the next tournament its own place at the table." /><div className="setup-layout"><FormIdentity icon="decks" title="From first pick to final round." description="Create the tournament, fill the seats, and post pairings when everyone is ready."><div className="setup-promise"><span>01 <strong>Format & rounds</strong></span><span>02 <strong>Players & seats</strong></span><span>03 <strong>Pairings & play</strong></span></div></FormIdentity><section className="panel">{board.canManage ? <NewTournamentForm eventId={id} house={board.house} /> : <><p className="subtle mb-4">Join this event to create a tournament.</p><ActButton label="Join event" action={joinEventById.bind(null,id)} /></>}</section></div></main>;
}
