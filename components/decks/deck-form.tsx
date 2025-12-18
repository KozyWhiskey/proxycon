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
import { Loader2, Search, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Deck } from '@/lib/types';
import { searchCards, getCardPrints, ScryfallCard } from '@/lib/scryfall';
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

  // Prints State
  const [printResults, setPrintResults] = useState<ScryfallCard[]>([]);
  const [isPrintsOpen, setIsPrintsOpen] = useState(false);
  const [isLoadingPrints, setIsLoadingPrints] = useState(false);

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

  const handleChangeArt = async () => {
    if (!commanderName) return;
    setIsLoadingPrints(true);
    setPrintResults([]);

    try {
      const prints = await getCardPrints(commanderName);
      if (prints.length === 0) {
        toast.error('No other prints found');
      } else {
        setPrintResults(prints);
        setIsPrintsOpen(true);
      }
    } catch (error) {
      toast.error('Error fetching prints');
    } finally {
      setIsLoadingPrints(false);
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

  const handleSelectPrint = (card: ScryfallCard) => {
    const art = card.image_uris?.art_crop || card.image_uris?.normal || '';
    setImageUrl(art);
    setIsPrintsOpen(false);
    toast.success('Art updated!');
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
        <div className="md:grid md:grid-cols-12 md:gap-6">
          {/* Desktop Left Column: Image Preview */}
          <div className="hidden md:block md:col-span-5 lg:col-span-4 space-y-4">
             {imageUrl ? (
              <div className="relative w-full aspect-[2.5/3.5] rounded-xl overflow-hidden border-2 border-slate-700 shadow-2xl group">
                <Image 
                  src={imageUrl} 
                  alt="Commander Art" 
                  fill 
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <Button 
                    type="button"
                    variant="secondary"
                    onClick={handleChangeArt}
                    disabled={isLoadingPrints}
                    className="gap-2 shadow-xl"
                   >
                     {isLoadingPrints ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                     Change Art
                   </Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                  <p className="text-xl font-bold text-white drop-shadow-md text-center">{commanderName}</p>
                </div>
              </div>
            ) : (
              <div className="w-full aspect-[2.5/3.5] bg-slate-900 border-2 border-slate-800 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                <p>Select a Commander to see card art</p>
              </div>
            )}
            
            {/* Desktop Stats/Description - REMOVED from left column to placce in wider right column */}
          </div>

          {/* Right Column (Desktop) / Main Column (Mobile): Form Inputs */}
          <div className="md:col-span-7 lg:col-span-8 space-y-4">
            
            {/* Basic Info Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

             {/* Commander Search */}
            <div className="space-y-2">
                <Label htmlFor="commanderName" className="text-slate-100">Commander</Label>
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
                    className="bg-slate-800 hover:bg-slate-700 text-slate-100 min-w-[3rem]"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
            </div>

            {/* Mobile-only Image Preview */}
            <div className="md:hidden">
              {imageUrl && (
                <div className="mt-2 relative w-full h-80 rounded-xl overflow-hidden border border-slate-800 group shadow-lg">
                  <Image 
                    src={imageUrl} 
                    alt="Commander Art" 
                    fill 
                    className="object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button 
                      type="button"
                      variant="secondary"
                      onClick={handleChangeArt}
                      disabled={isLoadingPrints}
                      className="gap-2"
                    >
                      {isLoadingPrints ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                      Change Art
                    </Button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <p className="text-lg font-bold text-white drop-shadow-md text-center">{commanderName}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-100">Color Identity</Label>
              <div className="flex flex-wrap gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-800/50">
                {MTG_COLORS.map((color) => (
                  <div key={color} className="flex items-center space-x-2">
                    <Checkbox
                      id={`color-${color}`}
                      checked={colors.includes(color)}
                      onCheckedChange={(checked) =>
                        handleColorChange(color, checked as boolean)
                      }
                      className="border-slate-600 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-black w-5 h-5"
                    />
                    <label
                      htmlFor={`color-${color}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300 cursor-pointer select-none"
                    >
                      {color}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-100 font-medium">Oracle Text / Stats</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Card text, stats, or notes..."
                className="bg-slate-950 border-slate-800 text-slate-300 min-h-[150px] font-mono text-sm"
              />
            </div>

            <div className="pt-4">
              <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black h-12 text-lg font-semibold shadow-lg shadow-yellow-500/10" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {initialData ? 'Save Changes' : 'Create Deck'}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Search Results Dialog - Larger Cards */}
      <Dialog open={isResultsOpen} onOpenChange={setIsResultsOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 sm:max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select a Card</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-2">
            {searchResults.map((card) => (
              <div 
                key={card.id} 
                className="cursor-pointer group relative rounded-xl overflow-hidden border-2 border-transparent hover:border-yellow-500 transition-all shadow-lg hover:shadow-yellow-500/20"
                onClick={() => handleSelectCard(card)}
              >
                {card.image_uris?.normal ? (
                  <div className="relative aspect-[2.5/3.5] w-full">
                    <Image 
                      src={card.image_uris.normal} 
                      alt={card.name} 
                      fill 
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-[2.5/3.5] bg-slate-800 flex items-center justify-center p-4 text-center text-slate-400 text-sm">
                    No Image Available
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                  <p className="text-xs font-bold text-slate-100 truncate">{card.name}</p>
                  <p className="text-[10px] text-slate-300 truncate">{card.type_line}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Prints Dialog - For Art Selection */}
      <Dialog open={isPrintsOpen} onOpenChange={setIsPrintsOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 sm:max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Art Variation</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-2">
            {printResults.map((card) => (
              <div 
                key={card.id} 
                className="cursor-pointer group relative rounded-xl overflow-hidden border-2 border-transparent hover:border-yellow-500 transition-all shadow-lg hover:shadow-yellow-500/20"
                onClick={() => handleSelectPrint(card)}
              >
                {card.image_uris?.normal ? (
                  <div className="relative aspect-[2.5/3.5] w-full">
                    <Image 
                      src={card.image_uris.normal} 
                      alt={card.name} 
                      fill 
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-[2.5/3.5] bg-slate-800 flex items-center justify-center p-4 text-center text-slate-400 text-sm">
                    No Image
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                  <p className="text-xs font-bold text-slate-100 truncate">{card.set_name}</p>
                  <p className="text-[10px] text-slate-300 truncate">#{card.collector_number}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
