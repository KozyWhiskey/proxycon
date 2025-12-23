'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Deck } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Swords, Edit2, Trash2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { ManaCost } from '@/components/ui/mana-symbol';
import { DeckInspector } from './deck-inspector';
import { deleteDeck } from '@/app/decks/actions';
import { toast } from 'sonner';
import DeckForm from './deck-form';

interface DeckListItemProps {
  deck: Deck;
  isOwner?: boolean;
}

export default function DeckListItem({ deck, isOwner = false }: DeckListItemProps) {
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
      // Parent list should ideally refresh, but router.refresh() in parent or here works
      router.refresh(); // Simple reload for list view updates
    } else {
      toast.error(result.message || 'Failed to delete deck');
    }
    setIsDeleting(false);
  };

  return (
    <>
      <Card 
        className="glass-panel group overflow-hidden border-white/5 hover:border-primary/50 transition-all cursor-pointer bg-white/5 hover:bg-white/10"
        onClick={() => setIsInspectorOpen(true)}
      >
        <div className="flex flex-row h-32 md:h-40">
          {/* Left: Card Image */}
          <div className="relative w-24 md:w-32 flex-shrink-0 bg-black/50 border-r border-white/10">
            {deck.image_url ? (
              <Image
                src={deck.image_url}
                alt={deck.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Swords className="w-8 h-8 text-muted-foreground/20" />
              </div>
            )}
          </div>

          {/* Right: Content */}
          <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
            
            {/* Top Row: Name & Mana */}
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-foreground font-heading tracking-wide truncate group-hover:text-primary transition-colors">
                  {deck.name}
                </h3>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                  <span>{deck.format}</span>
                  {deck.set_code && (
                     <img 
                      src={`https://svgs.scryfall.io/sets/${deck.set_code.toLowerCase()}.svg`} 
                      alt={deck.set_code}
                      className="w-3 h-3 invert opacity-50"
                      title={deck.set_name || deck.set_code}
                     />
                   )}
                   <span>•</span>
                   <span className="text-primary/80">{deck.commander_name || 'No Commander'}</span>
                </div>
              </div>
              
              {deck.mana_cost && (
                <div className="hidden sm:block flex-shrink-0">
                  <ManaCost manaCost={deck.mana_cost} size={16} />
                </div>
              )}
            </div>

            {/* Middle: Description / Oracle Preview */}
            <div className="mt-2 hidden md:block">
               <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed opacity-80">
                 {deck.oracle_text || deck.description || "No description."}
               </p>
            </div>

            {/* Bottom: Actions (Owner Only) or Mobile Mana */}
            <div className="mt-auto flex justify-between items-end pt-2">
               <div className="sm:hidden">
                  {deck.mana_cost && <ManaCost manaCost={deck.mana_cost} size={14} />}
               </div>

               {isOwner && (
                <div className="flex gap-2 ml-auto">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 border-white/10 hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditOpen(true);
                    }}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
               )}
            </div>
          </div>
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
        <DialogContent className="sm:max-w-5xl">
          <DeckForm 
            initialData={deck} 
            onSuccess={() => {
              setIsEditOpen(false);
              router.refresh();
            }} 
          />
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
         <div className="p-6 space-y-4 bg-zinc-950 border border-white/10 rounded-lg">
            <h3 className="text-lg font-bold">Delete Deck?</h3>
            <p className="text-sm text-muted-foreground">Are you sure you want to delete <strong>{deck.name}</strong>?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="animate-spin w-4 h-4" /> : 'Delete'}
              </Button>
            </div>
         </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
