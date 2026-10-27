import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { memoryContext } from '@/lib/deck-memory-server';
import { deckMemoriesEnabled } from '@/lib/deck-memory-config';
import { StartDeckMemory } from '@/components/decks/start-deck-memory';
import { PageIntro } from '@/components/layout/page-intro';

export default async function DeckPhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!deckMemoriesEnabled()) notFound();
  let ctx;
  try { ctx = await memoryContext(); } catch { redirect('/'); }
  const [{ data: tournament }, { data: memory }, { data: participant }] = await Promise.all([
    ctx.supabase.from('tournaments').select('name,format,event_id').eq('id', id).maybeSingle(),
    ctx.supabase.from('event_decks').select('id').eq('tournament_id', id).eq('profile_id', ctx.playerId).eq('is_current', true).maybeSingle(),
    ctx.supabase.from('tournament_participants').select('id').eq('tournament_id', id).eq('profile_id', ctx.playerId).maybeSingle(),
  ]);
  if (!tournament || !['draft','set_draft','chaos_draft','cube','sealed'].includes(tournament.format)) notFound();
  if (memory) redirect(`/decks/limited/${memory.id}`);
  return <main className="page collection-page task-page">
    <Link href={`/tournament/${id}`} className="text-link underline">Back to {tournament.name}</Link>
    <PageIntro compact title="Save your deck" description="Photograph your deck, check the cards, and remember what you played." />
    {participant ? <StartDeckMemory tournamentId={id} /> : <p>Join this tournament before saving a deck.</p>}
  </main>;
}
