'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { identifyDeckPhotos, saveDeckSnapshot, saveLibraryDeckPhoto, searchSnapshotCard } from '@/app/decks/snapshot-actions';
import { ResolvedDeckCard } from '@/lib/deck-read';
import { toast } from 'sonner';

interface LibraryDeck {
  id: string;
  name: string;
  commander_name: string | null;
}

export default function DeckCapture({
  tournamentId,
  cardSource,
  decks,
}: {
  tournamentId: string;
  cardSource: string;
  decks: LibraryDeck[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [cards, setCards] = useState<ResolvedDeckCard[] | null>(null);
  const [photoPaths, setPhotoPaths] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [libraryDeckId, setLibraryDeckId] = useState(decks[0]?.id || '');
  const libraryOnly = cardSource === 'none';

  async function readPhotos(formData: FormData) {
    setPending(true);
    if (libraryOnly) {
      const files = formData.getAll('photos').filter((entry): entry is File => entry instanceof File && entry.size > 0);
      const paths: string[] = [];
      if (files.length > 0) {
        const identified = await identifyDeckPhotos(tournamentId, formData);
        if (!identified.success) {
          toast.error(identified.message || 'Could not upload the photo');
          setPending(false);
          return;
        }
        paths.push(...(identified.photoPaths || []));
      }
      const saved = await saveLibraryDeckPhoto({ tournamentId, deckId: libraryDeckId, photoPaths: paths });
      setPending(false);
      if (!saved.success) {
        toast.error(saved.message || 'Could not save');
        return;
      }
      toast.success('Deck saved on this sitting');
      router.refresh();
      return;
    }

    const result = await identifyDeckPhotos(tournamentId, formData);
    setPending(false);
    if (!result.success || !result.cards) {
      toast.error(result.message || 'Could not read the photo');
      return;
    }
    setPhotoPaths(result.photoPaths || []);
    setCards(result.cards);
  }

  async function addSearch() {
    if (!query.trim()) return;
    const result = await searchSnapshotCard(tournamentId, query.trim());
    if (!result.success || !result.cards?.[0]) {
      toast.error(result.message || 'No card');
      return;
    }
    setCards((current) => [...(current || []), result.cards![0]]);
    setQuery('');
  }

  async function confirm() {
    if (!cards) return;
    setPending(true);
    const result = await saveDeckSnapshot({ tournamentId, photoPaths, cards: cards.filter((card) => card.count > 0) });
    setPending(false);
    if (!result.success) {
      toast.error(result.message || 'Could not save');
      return;
    }
    toast.success('Deck saved');
    setCards(null);
    router.refresh();
  }

  if (cards) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Fix anything flagged, then save. Nothing is published until you confirm.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {cards.map((card, index) => (
            <div key={`${card.name}-${index}`} className={`rounded-md border p-2 space-y-2 ${card.flagged ? 'border-amber-500/60' : 'border-border'}`}>
              {card.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.imageUrl} alt="" className="w-full rounded" />
              ) : (
                <div className="h-24 bg-muted rounded" />
              )}
              <p className="text-sm text-foreground">{card.name}</p>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setCards(cards.map((item, itemIndex) => itemIndex === index ? { ...item, count: Math.max(0, item.count - 1) } : item))}>−</Button>
                <span className="font-mono">{card.count}</span>
                <Button type="button" size="sm" variant="outline" onClick={() => setCards(cards.map((item, itemIndex) => itemIndex === index ? { ...item, count: item.count + 1 } : item))}>+</Button>
              </div>
              {card.flagged && <p className="text-xs text-amber-400">Check this one</p>}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Add a missed card" />
          <Button type="button" variant="outline" onClick={addSearch}>Add</Button>
        </div>
        <Button onClick={confirm} disabled={pending} className="w-full h-12">
          {pending ? 'Saving...' : 'Save deck on this sitting'}
        </Button>
      </div>
    );
  }

  return (
    <form action={readPhotos} className="space-y-4">
      <div className="rounded-md border border-border p-3 text-sm text-muted-foreground space-y-1">
        <p>Lay the deck out so every name line is visible.</p>
        <p>Pull stacks apart. Fan basics, or type the land count after.</p>
        <p>Take a second photo if the cards get small. Foil glare still needs a check.</p>
      </div>
      {libraryOnly && (
        <label className="block space-y-2 text-sm">
          Commander deck
          <select
            value={libraryDeckId}
            onChange={(event) => setLibraryDeckId(event.target.value)}
            className="w-full h-12 rounded-md border border-border bg-transparent px-3"
          >
            {decks.length === 0 && <option value="">No decks in your library</option>}
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>{deck.name}</option>
            ))}
          </select>
        </label>
      )}
      <Input name="photos" type="file" accept="image/*" capture="environment" multiple={!libraryOnly} className="h-12" />
      <Button type="submit" disabled={pending || (libraryOnly && !libraryDeckId)} className="w-full h-12">
        {pending ? 'Reading...' : libraryOnly ? 'Save deck' : 'Read the photo'}
      </Button>
    </form>
  );
}
