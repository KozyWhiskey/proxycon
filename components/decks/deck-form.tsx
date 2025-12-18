'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createDeck, updateDeck } from '@/app/decks/actions';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Deck } from '@/lib/types';
import { searchCards, ScryfallCard } from '@/lib/scryfall';
import Image from 'next/image';
import { Textarea } from '@/components/ui/textarea'; // Assuming this exists or using standard

interface DeckFormProps {
  initialData?: Deck;
  onSuccess?: () => void;
}

const MTG_COLORS = ['W', 'U', 'B', 'R', 'G'];
const MTG_FORMATS = ['Commander', 'Modern', 'Standard', 'Legacy', 'Pauper', 'Cube', 'Other'];

export default function DeckForm({ initialData, onSuccess }: DeckFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Form State
  const [name, setName] = useState(initialData?.name || '');
  const [format, setFormat] = useState(initialData?.format || 'Commander');
  const [colors, setColors] = useState<string[]>(initialData?.colors || []);
  const [commanderName, setCommanderName] = useState(initialData?.commander_name || '');
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || '');
  const [description, setDescription] = useState(initialData?.description || '');

  // Search State
  const [searchResults, setSearchResults] = useState<ScryfallCard[]>([]);
  const [isResultsOpen, setIsResultsOpen] = useState(false);

  const handleColorChange = (color: string, checked: boolean) => {
    setColors((prev) =>
      checked ? [...prev, color].sort() : prev.filter((c) => c !== color)
    );
  };

  const handleSearch = async () => {
    if (!commanderName) return;
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      const cards = await searchCards(commanderName);
      
      if (cards.length === 0) {
        toast.error('No cards found');
      } else if (cards.length === 1) {
        handleSelectCard(cards[0]);
        toast.success('Found card!');
      } else {
        setSearchResults(cards);
        setIsResultsOpen(true);
      }
    } catch (error) {
      toast.error('Error searching for card');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCard = (card: ScryfallCard) => {
    setCommanderName(card.name);
    setColors(card.color_identity);
    
    const art = card.image_uris?.art_crop || card.image_uris?.normal || '';
    setImageUrl(art);

    // Format description
    const desc = `${card.mana_cost || ''} — ${card.type_line || ''}\n\n${card.oracle_text || ''}`;
    setDescription(desc);

    setIsResultsOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('format', format);
    colors.forEach((c) => formData.append('colors', c));
    if (commanderName) formData.append('commanderName', commanderName);
    if (imageUrl) formData.append('imageUrl', imageUrl);
    if (description) formData.append('description', description);

    let res;
    if (initialData?.id) {
      res = await updateDeck(initialData.id, formData);
    } else {
      res = await createDeck(formData);
    }

    if (res.success) {
      toast.success(initialData ? 'Deck updated successfully!' : 'Deck created successfully!');
      onSuccess?.();
      if (!initialData) {
        router.refresh();
      }
    } else {
      toast.error(res.message || 'Failed to save deck.');
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <div className="space-y-2">
          <Label htmlFor="deckName" className="text-slate-100">Deck Name</Label>
          <Input
            id="deckName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Awesome Deck"
            required
            className="bg-slate-950 border-slate-800 text-slate-100"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="format" className="text-slate-100">Format</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger className="w-full bg-slate-950 border-slate-800 text-slate-100">
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
          <Label className="text-slate-100">Colors</Label>
          <div className="flex flex-wrap gap-2">
            {MTG_COLORS.map((color) => (
              <div key={color} className="flex items-center space-x-2">
                <Checkbox
                  id={`color-${color}`}
                  checked={colors.includes(color)}
                  onCheckedChange={(checked) =>
                    handleColorChange(color, checked as boolean)
                  }
                  className="border-slate-700 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-black"
                />
                <label
                  htmlFor={`color-${color}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300"
                >
                  {color}
                </label>
              </div>
            ))}
          </div>
        </div>

        {format === 'Commander' && (
          <div className="space-y-2">
            <Label htmlFor="commanderName" className="text-slate-100">Commander Name</Label>
            <div className="flex gap-2">
              <Input
                id="commanderName"
                value={commanderName}
                onChange={(e) => setCommanderName(e.target.value)}
                placeholder="Kenrith, the Returned King"
                className="bg-slate-950 border-slate-800 text-slate-100 flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
              <Button 
                type="button" 
                onClick={handleSearch} 
                disabled={isSearching || !commanderName}
                variant="secondary"
                className="bg-slate-800 hover:bg-slate-700 text-slate-100"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            {imageUrl && (
              <div className="mt-2 relative w-full h-48 rounded-md overflow-hidden border border-slate-800">
                <Image 
                  src={imageUrl} 
                  alt="Commander Art" 
                  fill 
                  className="object-cover object-top opacity-80"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-xs text-white font-medium">{commanderName}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="description" className="text-slate-100">Description / Stats</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Card text, stats, or notes..."
            className="bg-slate-950 border-slate-800 text-slate-100 min-h-[100px]"
          />
        </div>

        <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {initialData ? 'Save Changes' : 'Create Deck'}
        </Button>
      </form>

      {/* Search Results Dialog */}
      <Dialog open={isResultsOpen} onOpenChange={setIsResultsOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select a Card</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-2">
            {searchResults.map((card) => (
              <div 
                key={card.id} 
                className="cursor-pointer group relative rounded-lg overflow-hidden border border-transparent hover:border-yellow-500 transition-all"
                onClick={() => handleSelectCard(card)}
              >
                {card.image_uris?.normal ? (
                  <div className="relative aspect-[2.5/3.5]">
                    <Image 
                      src={card.image_uris.normal} 
                      alt={card.name} 
                      fill 
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-[2.5/3.5] bg-slate-800 flex items-center justify-center p-2 text-center text-slate-400 text-sm">
                    No Image
                  </div>
                )}
                <div className="p-2 bg-slate-950/90 text-center">
                  <p className="text-xs font-bold text-slate-100 truncate">{card.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{card.type_line}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
