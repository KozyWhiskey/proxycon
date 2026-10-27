import { deckMemoriesEnabled } from '@/lib/deck-memory-config';
import { resolvePlayer } from '@/lib/player-session';
import {LimitedMemoryCard} from './limited-memory-card';
import {memoryShowcase} from '@/lib/deck-memory-showcase';
import {memoryShowcaseArtwork} from '@/lib/deck-memory-catalog';
import {deckTotals} from '@/lib/deck-builder';
import type {MemoryCard,DeckCategory} from '@/lib/deck-memory';

export async function LimitedMemoryList({ tournamentId }: { tournamentId?: string }) {
  if (!deckMemoriesEnabled()) return null;
  const ctx = await resolvePlayer();
  if (!ctx.playerId) return null;
  let query = ctx.supabase.from('event_decks').select('id,title,status,shared,created_at,profile_id,tournament_id,is_current,cards,categories').order('created_at', { ascending: false });
  query = tournamentId ? query.eq('tournament_id', tournamentId) : query.eq('profile_id', ctx.playerId);
  const { data, error } = await query;
  const memories=await Promise.all((data||[]).map(async memory=>{
    const cards=(memory.cards||[]) as MemoryCard[],categories=(memory.categories||[]) as DeckCategory[];
    const showcase=memoryShowcase(cards,categories),totals=deckTotals(cards,categories);
    const artUrl=showcase?await memoryShowcaseArtwork(showcase).catch(()=>showcase.imageUrl):null;
    return {...memory,main:totals.main,sideboard:totals.sideboard,showcaseName:showcase?.name||null,artUrl};
  }));
  return <section className="space-y-4">
    <h2 className="font-heading text-2xl">{tournamentId ? 'Deck memories' : 'Limited decks'}</h2>
    {error ? <p className="text-sm text-muted-foreground">Deck memories are unavailable. Your Commander decks are unaffected.</p> : memories.length ? <ul className="deck-library-grid">{memories.map(memory => <li key={memory.id}>
      <LimitedMemoryCard {...memory}/>
    </li>)}</ul> : <p className="text-sm text-muted-foreground">{tournamentId ? 'Your saved deck and shared playgroup decks will appear here.' : 'Open one of your Limited tournaments and choose Save your deck.'}</p>}
  </section>;
}
