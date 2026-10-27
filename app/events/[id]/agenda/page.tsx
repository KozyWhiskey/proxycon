import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadEventBoard } from '@/lib/event-board';
import { loadAgenda } from '@/lib/agenda';
import { AgendaEditor } from '@/components/events/agenda-editor';
import { PageIntro } from '@/components/layout/page-intro';
export default async function Page({ params }: {
    params: Promise<{
        id: string;
    }>;
}) { const { id } = await params; const board = await loadEventBoard(id); if (!board)
    notFound(); const { items, error } = await loadAgenda(id); return <main className="page form-page"><Link href={'/events/' + id}>← {board.event.name}</Link><PageIntro title="Weekend agenda" description="Loose plans for the group. Start games when everyone is ready."/>{error ? <p role="alert">{error}</p> : <AgendaEditor eventId={id} items={items} members={board.members} tournaments={board.tournaments} canManage={board.canManage} start={board.event.start_date} end={board.event.end_date}/>}</main>; }
