import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { deckMemoriesEnabled } from '@/lib/deck-memory-config';
import { loadMemory } from '@/lib/deck-memory-server';
import { DeckMemoryEditor } from '@/components/decks/deck-memory-editor';
import { resolvePlayer } from '@/lib/player-session';
import { PageIntro } from '@/components/layout/page-intro';

export default async function LimitedMemoryPage({ params }: { params: Promise<{ id: string }> }) {
  if (!deckMemoriesEnabled()) notFound();
  if (!(await resolvePlayer()).playerId) redirect('/');
  let data;
  try { data = await loadMemory((await params).id); } catch { notFound(); }
  return <main className={`page collection-page deck-memory-page${data.owner ? ' task-page' : ''}`}>
    <PageIntro compact={data.owner} eyebrow={data.tournament?.name || 'Limited deck'} title={data.owner ? 'Review your deck' : data.memory.title}
      actions={<Link href="/decks" className="text-link underline">My decks</Link>} description={data.owner ? undefined : 'A deck memory shared with the playgroup.'} />
    <DeckMemoryEditor initial={data} />
  </main>;
}
