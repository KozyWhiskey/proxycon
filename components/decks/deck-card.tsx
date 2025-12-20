'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Deck } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Swords, Trash2, Edit2, Loader2 } from 'lucide-react';
import DeckForm from './deck-form';
import { deleteDeck } from '@/app/decks/actions';
import { toast } from 'sonner';
import Image from 'next/image';

interface DeckCardProps {
  deck: Deck;
}

export default function DeckCard({ deck }: DeckCardProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
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
      <Card className="glass-panel relative overflow-hidden group min-h-[160px] border-white/10 hover:border-primary/50 transition-colors">
        {deck.image_url && (
          <div className="absolute inset-0 z-0 opacity-20 group-hover:opacity-30 transition-opacity">
            <Image
              src={deck.image_url}
              alt={deck.name}
              fill
              className="object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
          </div>
        )}
        <div className="relative z-10 flex flex-col h-full justify-between">
          <CardHeader>
            <CardTitle className="text-xl text-foreground flex items-center gap-2 drop-shadow-md font-heading tracking-wide">
              <Swords className="w-5 h-5 text-primary" />
              {deck.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-end">
            <div>
              <p className="text-muted-foreground font-medium text-sm drop-shadow-md">
                {deck.format}
                {deck.commander_name && (
                  <span className="block text-xs text-muted-foreground/80 font-normal mt-0.5">
                    {deck.commander_name}
                  </span>
                )}
              </p>
              {deck.colors && deck.colors.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {deck.colors.map((color: string) => (
                    <span
                      key={color}
                      className={`w-4 h-4 rounded-full ${
                        color === 'W' ? 'bg-[#f8e7b9]' : 
                        color === 'U' ? 'bg-[#0e68ab]' : 
                        color === 'B' ? 'bg-[#150b00]' : 
                        color === 'R' ? 'bg-[#d3202a]' : 
                        'bg-[#00733e]'
                      } border border-white/20 shadow-sm`}
                      title={color}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-foreground border-white/10 bg-black/20 backdrop-blur-sm hover:bg-black/40"
                onClick={() => setIsEditOpen(true)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="destructive" 
                size="icon" 
                className="h-8 w-8 bg-destructive/50 hover:bg-destructive backdrop-blur-sm shadow-none"
                onClick={() => setIsDeleteOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Edit Deck</DialogTitle>
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
            <DialogTitle>Delete Deck</DialogTitle>
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
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}