'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import DeckForm from '@/components/decks/deck-form';

export default function CreateDeckDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">
          <Plus className="w-4 h-4 mr-2" />
          New deck
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-5xl deck-editor-dialog">
        <DialogHeader>
          <DialogTitle>New deck</DialogTitle>
          <DialogDescription>Name your deck, find its commander, and choose the art that feels right.</DialogDescription>
        </DialogHeader>
        <DeckForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
