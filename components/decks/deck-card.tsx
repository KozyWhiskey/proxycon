'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Deck } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Trash2, Edit2, Loader2, ArrowUpRight, Layers } from 'lucide-react';
import DeckForm from './deck-form';
import { deleteDeck } from '@/app/decks/actions';
import { toast } from 'sonner';
import Image from 'next/image';
import { ManaCost, ManaSymbol } from '@/components/ui/mana-symbol';
import { DeckInspector } from './deck-inspector';

interface DeckCardProps {
  deck: Deck;
  isOwner?: boolean;
}

export default function DeckCard({ deck, isOwner = true }: DeckCardProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteDeck(deck.id);
    if (result.success) {
      toast.success('Deck deleted successfully');
      setIsDeleteOpen(false);
      router.refresh();
    } else {
      toast.error(result.message || 'Failed to delete deck');
    }
    setIsDeleting(false);
  };

  return (
    <>
      <Card 
        className="deck-gallery-card group"
      >
        <button type="button" className="deck-open" aria-label={`View ${deck.name}`} onClick={() => setIsInspectorOpen(true)} />
        {deck.image_url ? (
          <div className="deck-gallery-art">
            <Image
              src={deck.image_url}
              alt={deck.name}
              fill
              unoptimized
              className="object-cover object-top"
            />
          </div>
        ) : <div className="deck-gallery-art no-art"><Layers size={54} aria-hidden="true" /><span>No artwork yet</span></div>}
        <span className="deck-inspect-cue"><ArrowUpRight size={17} /></span>
        <div className="deck-gallery-content">
          <CardHeader className="deck-gallery-heading">
            <span className="eyebrow">{deck.format || 'Commander'}</span>
            <CardTitle className="deck-gallery-title">
              {deck.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="deck-gallery-footer">
            <div>
              <div className="text-muted-foreground font-medium text-sm flex flex-wrap gap-2 items-center">
                 {deck.mana_cost && <ManaCost manaCost={deck.mana_cost} size={14} className="opacity-80" />}
                 {deck.set_code && <span className="deck-set-code" title={deck.set_name || deck.set_code}>{deck.set_code.toUpperCase()}</span>}
              </div>
              {deck.commander_name && (
                  <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                    {deck.commander_name}
                  </span>
                )}
              {deck.colors && deck.colors.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {['W', 'U', 'B', 'R', 'G'].filter((color) => deck.colors?.includes(color)).map((color) => (
                    <ManaSymbol key={color} symbol={color} size={16} />
                  ))}
                </div>
              )}
            </div>
            {isOwner && (
              <div className="deck-gallery-tools">
                <Button 
                  variant="outline" 
                  aria-label={`Edit ${deck.name}`}
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground border-border bg-card hover:bg-card"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditOpen(true);
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button 
                  variant="destructive" 
                  aria-label={`Delete ${deck.name}`}
                  size="icon" 
                  className="h-8 w-8 bg-destructive/50 hover:bg-destructive shadow-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDeleteOpen(true);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </div>
      </Card>

      {/* Inspector Dialog */}
      <Dialog open={isInspectorOpen} onOpenChange={setIsInspectorOpen}>
        <DeckInspector 
          deck={deck} 
          onEdit={() => {
            setIsInspectorOpen(false);
            setIsEditOpen(true);
          }}
          isOwner={isOwner}
        />
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-5xl deck-editor-dialog">
          <DialogHeader>
            <DialogTitle>Edit deck</DialogTitle>
            <DialogDescription>Make the deck yours. Update the commander, artwork, and details.</DialogDescription>
          </DialogHeader>
          <DeckForm 
            initialData={deck} 
            onSuccess={() => {
              setIsEditOpen(false);
              router.refresh();
            }} 
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete deck</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deck.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete deck'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
