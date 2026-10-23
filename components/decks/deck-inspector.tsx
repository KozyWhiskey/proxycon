'use client';

import { Deck } from '@/lib/types';
import { DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Edit2 } from 'lucide-react';
import Image from 'next/image';
import { ManaCost } from '@/components/ui/mana-symbol';
import { RichTextDisplay } from './rich-text-display';

interface DeckInspectorProps {
  deck: Deck;
  onEdit: () => void;
  onClose?: () => void;
  isOwner?: boolean;
}

export function DeckInspector({ deck, onEdit, isOwner = false }: DeckInspectorProps) {
  return (
    <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border p-0 gap-0 deck-inspector-dialog">
      <DialogDescription className="sr-only">{deck.name}. Commander, card artwork, and deck details.</DialogDescription>
      <div className="md:grid md:grid-cols-5 h-full">
        
        {/* Left Column: Art (Hero Image) */}
        <div className="relative h-64 md:h-auto md:col-span-2 bg-card overflow-hidden group">
          {deck.image_uris?.art_crop || deck.image_uris?.large || deck.image_url ? (
            <>
              <Image
                src={deck.image_uris?.large || deck.image_uris?.normal || deck.image_uris?.art_crop || deck.image_url || ''}
                alt={deck.commander_name || deck.name}
                fill
                unoptimized
                className="object-cover object-top md:object-center"
                priority
              />
              <div className="deck-inspector-shade" />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground bg-card">
              No Art Available
            </div>
          )}
        </div>

        {/* Right Column: Data */}
        <div className="p-6 md:col-span-3 flex flex-col h-full space-y-6">
          
          {/* Header */}
          <div className="space-y-2">
            <div className="flex justify-between items-start gap-4">
              <DialogTitle className="text-2xl font-bold leading-tight text-foreground">
                {deck.name}
              </DialogTitle>
              {/* Desktop Edit Button */}
              {isOwner && (
                <Button 
                  variant="outline" 
                  aria-label={`Edit ${deck.name}`}
                  size="icon" 
                  onClick={onEdit} 
                  className="hidden md:flex shrink-0 border-border hover:bg-muted"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="bg-muted px-2 py-0.5 rounded border border-border">
                {deck.format}
              </span>
              
              {deck.set_name && (
                <div className="flex items-center gap-1.5" title={deck.set_name}>
                  <span className="truncate max-w-[150px]">{deck.set_name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="w-full h-px bg-muted" />

          {/* Commander Details */}
          <div className="space-y-4 flex-1">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-primary">{deck.commander_name || 'Unknown Commander'}</h3>
              <div className="flex items-center gap-2">
                {deck.mana_cost ? (
                  <ManaCost manaCost={deck.mana_cost} />
                ) : (
                  <span className="text-xs text-muted-foreground italic">No mana cost</span>
                )}
              </div>
            </div>

            <div className="bg-muted rounded-lg p-4 border border-border space-y-3">
              {deck.type_line && (
                <div className="pb-3 border-b border-border">
                  <p className="font-semibold text-sm">{deck.type_line}</p>
                </div>
              )}
              
              <div className="text-sm text-zinc-300">
                {deck.oracle_text ? (
                  <RichTextDisplay text={deck.oracle_text} />
                ) : (
                  <p className="italic text-muted-foreground">{deck.description || "No text available."}</p>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Edit Button (Sticky Bottom) */}
          {isOwner && (
            <div className="md:hidden pt-4">
              <Button onClick={onEdit} className="w-full" variant="secondary">
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Deck
              </Button>
            </div>
          )}

        </div>
      </div>
    </DialogContent>
  );
}
