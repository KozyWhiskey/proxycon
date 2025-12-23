'use client';

import { Deck } from '@/lib/types';
import DeckCard from './deck-card';
import DeckListItem from './deck-list-item';

interface DeckListProps {
  decks: Deck[];
  isOwner?: boolean;
  variant?: 'grid' | 'list';
}

export default function DeckList({ decks, isOwner = false, variant = 'grid' }: DeckListProps) {
  if (!decks || decks.length === 0) {
    return (
      <div className="text-center py-12 border border-white/5 rounded-xl bg-white/5">
        <p className="text-muted-foreground italic">No decks found.</p>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className="flex flex-col gap-4">
        {decks.map((deck) => (
          <DeckListItem key={deck.id} deck={deck} isOwner={isOwner} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {decks.map((deck) => (
        <DeckCard key={deck.id} deck={deck} isOwner={isOwner} />
      ))}
    </div>
  );
}
