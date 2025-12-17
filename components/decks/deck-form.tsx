'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox'; // Assuming Checkbox component exists
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createDeck, updateDeck } from '@/app/decks/actions';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Deck } from '@/lib/types'; // Assuming Deck type is available

interface DeckFormProps {
  initialData?: Deck; // For editing existing decks
  onSuccess?: () => void;
}

const MTG_COLORS = ['W', 'U', 'B', 'R', 'G'];
const MTG_FORMATS = ['Commander', 'Modern', 'Standard', 'Legacy', 'Pauper', 'Cube', 'Other'];

export default function DeckForm({ initialData, onSuccess }: DeckFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(initialData?.name || '');
  const [format, setFormat] = useState(initialData?.format || 'Commander');
  const [colors, setColors] = useState<string[]>(initialData?.colors || []);
  const [commanderName, setCommanderName] = useState(initialData?.commander_name || '');

  const handleColorChange = (color: string, checked: boolean) => {
    setColors((prev) =>
      checked ? [...prev, color].sort() : prev.filter((c) => c !== color)
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('format', format);
    colors.forEach((c) => formData.append('colors', c));
    if (commanderName) {
      formData.append('commanderName', commanderName);
    }

    let res;
    if (initialData?.id) {
      res = await updateDeck(initialData.id, formData);
    } else {
      res = await createDeck(formData);
    }

    if (res.success) {
      toast.success(initialData ? 'Deck updated successfully!' : 'Deck created successfully!');
      onSuccess?.(); // Close dialog or navigate
      if (!initialData) {
        // If creating a new deck, navigate to its page or refresh decks list
        router.refresh();
      }
    } else {
      toast.error(res.message || 'Failed to save deck.');
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div className="space-y-2">
        <Label htmlFor="deckName">Deck Name</Label>
        <Input
          id="deckName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Awesome Deck"
          required
          className="bg-slate-950 border-slate-800"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="format">Format</Label>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger className="w-full bg-slate-950 border-slate-800">
            <SelectValue placeholder="Select a format" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            {MTG_FORMATS.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Colors</Label>
        <div className="flex flex-wrap gap-2">
          {MTG_COLORS.map((color) => (
            <div key={color} className="flex items-center space-x-2">
              <Checkbox
                id={`color-${color}`}
                checked={colors.includes(color)}
                onCheckedChange={(checked) =>
                  handleColorChange(color, checked as boolean)
                }
                className="border-slate-700"
              />
              <label
                htmlFor={`color-${color}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {color}
              </label>
            </div>
          ))}
        </div>
      </div>

      {format === 'Commander' && (
        <div className="space-y-2">
          <Label htmlFor="commanderName">Commander Name</Label>
          <Input
            id="commanderName"
            value={commanderName}
            onChange={(e) => setCommanderName(e.target.value)}
            placeholder="Kenrith, the Returned King"
            className="bg-slate-950 border-slate-800"
          />
        </div>
      )}

      <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        {initialData ? 'Save Changes' : 'Create Deck'}
      </Button>
    </form>
  );
}
