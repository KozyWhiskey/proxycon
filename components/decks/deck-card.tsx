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
      <Card className="bg-slate-900 border-slate-800 relative overflow-hidden group min-h-[160px]">
        {deck.image_url && (
          <div className="absolute inset-0 z-0 opacity-20 group-hover:opacity-30 transition-opacity">
            <Image
              src={deck.image_url}
              alt={deck.name}
              fill
              className="object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
          </div>
        )}
        <div className="relative z-10 flex flex-col h-full justify-between">
          <CardHeader>
            <CardTitle className="text-xl text-slate-100 flex items-center gap-2 drop-shadow-md">
              <Swords className="w-5 h-5 text-yellow-500" />
              {deck.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-end">
            <div>
              <p className="text-slate-300 font-medium text-sm drop-shadow-md">
                {deck.format}
                {deck.commander_name && (
                  <span className="block text-xs text-slate-400 font-normal mt-0.5">
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
                      } border border-slate-700 shadow-sm`}
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
                className="h-8 w-8 text-slate-400 hover:text-white border-slate-700 bg-slate-900/50 backdrop-blur-sm"
                onClick={() => setIsEditOpen(true)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="destructive" 
                size="icon" 
                className="h-8 w-8 bg-red-900/50 hover:bg-red-900 backdrop-blur-sm"
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
        <DialogContent className="bg-slate-900 border-slate-800">
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
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle>Delete Deck</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete <strong>{deck.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
              className="bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
