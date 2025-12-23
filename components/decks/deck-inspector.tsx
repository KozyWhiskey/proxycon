'use client';

import { Deck } from '@/lib/types';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Edit2, X } from 'lucide-react';
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
    <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-white/10 p-0 gap-0">
      <div className="md:grid md:grid-cols-5 h-full">
        
        {/* Left Column: Art (Hero Image) */}
        <div className="relative h-64 md:h-auto md:col-span-2 bg-black/50 overflow-hidden group">
          {deck.image_uris?.art_crop || deck.image_uris?.large || deck.image_url ? (
            <>
              <Image
                src={deck.image_uris?.large || deck.image_uris?.normal || deck.image_url || ''}
                alt={deck.commander_name || deck.name}
                fill
                className="object-cover object-top md:object-center"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-zinc-950/80" />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground bg-zinc-900">
              No Art Available
            </div>
          )}
        </div>

        {/* Right Column: Data */}
        <div className="p-6 md:col-span-3 flex flex-col h-full space-y-6">
          
          {/* Header */}
          <div className="space-y-2">
            <div className="flex justify-between items-start gap-4">
              <h2 className="text-2xl font-bold font-heading tracking-wide text-foreground leading-tight">
                {deck.name}
              </h2>
              {/* Desktop Edit Button */}
              {isOwner && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={onEdit} 
                  className="hidden md:flex shrink-0 border-white/10 hover:bg-white/10"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">
                {deck.format}
              </span>
              
              {deck.set_name && (
                <div className="flex items-center gap-1.5" title={deck.set_name}>
                  {deck.set_code && (
                    <img 
                      src={`https://svgs.scryfall.io/sets/${deck.set_code.toLowerCase()}.svg`} 
                      alt={deck.set_code}
                      className="w-4 h-4 invert opacity-70" 
                    />
                  )}
                  <span className="truncate max-w-[150px]">{deck.set_name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="w-full h-px bg-white/10" />

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

            <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-3">
              {deck.type_line && (
                <div className="pb-3 border-b border-white/5">
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
