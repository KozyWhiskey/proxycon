import { withLiveSnapshot } from '@/lib/live-page';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadEventBoard } from '@/lib/event-board';
import { makeRecap } from '@/lib/recap';
import { RecapExport } from '@/components/events/recap-export';
import { PageIntro } from '@/components/layout/page-intro';
async function Page({ params }: {
    params: Promise<{
        id: string;
    }>;
}) { const { id } = await params; const board = await loadEventBoard(id); if (!board)
    notFound(); return <main className="page recap-page"><div className="recap-controls"><Link href={'/events/' + id}>← {board.event.name}</Link><PageIntro title="Weekend recap" description="Print or download your event summary to share with the group."/></div><RecapExport snapshot={makeRecap(board)}/></main>; }

export default withLiveSnapshot(Page);
