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
import { deleteDeck } from '@/app/decks/actions'; // This seems unused here, but keeping imports consistent
import { Textarea } from '@/components/ui/textarea';
import { ManaCost } from '@/components/ui/mana-symbol';
import { RichTextDisplay } from './rich-text-display';
import Image from 'next/image';

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
  const [partnerName, setPartnerName] = useState(initialData?.partner_name || '');
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [manaCost, setManaCost] = useState(initialData?.mana_cost || '');
  const [typeLine, setTypeLine] = useState(initialData?.type_line || '');
  const [oracleText, setOracleText] = useState(initialData?.oracle_text || '');
  const [expansionCode, setExpansionCode] = useState(initialData?.set_code || '');
  const [expansionName, setExpansionName] = useState(initialData?.set_name || '');
  const [imageUris, setImageUris] = useState<ScryfallCard['image_uris']>(initialData?.image_uris || undefined);

  // Search State
  const [searchResults, setSearchResults] = useState<ScryfallCard[]>([]);
  const [isResultsOpen, setIsResultsOpen] = useState(false);

  // Prints State
  const [printResults, setPrintResults] = useState<ScryfallCard[]>([]);
  const [isPrintsOpen, setIsPrintsOpen] = useState(false);
  const [isLoadingPrints, setIsLoadingPrints] = useState(false);
  const [isFullArtOpen, setIsFullArtOpen] = useState(false);

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
    setImageUris(card.image_uris);
    setManaCost(card.mana_cost || '');
    setTypeLine(card.type_line || '');
    setOracleText(card.oracle_text || '');
    setExpansionCode(card.set || '');
    setExpansionName(card.set_name || '');

    // Format description (Legacy fallback)
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
    if (partnerName) formData.append('partnerName', partnerName);
    if (imageUrl) formData.append('imageUrl', imageUrl);
    if (description) formData.append('description', description);
    if (manaCost) formData.append('manaCost', manaCost);
    if (typeLine) formData.append('typeLine', typeLine);
    if (oracleText) formData.append('oracleText', oracleText);
    if (expansionCode) formData.append('setCode', expansionCode);
    if (expansionName) formData.append('setName', expansionName);
    if (imageUris) formData.append('imageUris', JSON.stringify(imageUris));

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
              <div className="relative w-full aspect-[2.5/3.5] rounded-xl overflow-hidden border-2 border-border shadow-2xl group hover:border-primary/50 transition-colors">
                <Image
                  src={imageUrl}
                  alt="Commander Art"
                  fill
                  unoptimized
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                 <div className="absolute bottom-0 left-0 right-0 z-10 bg-card border-t border-border p-3 flex flex-wrap items-center justify-center gap-2">
                   <Button 
                    type="button"
                    variant="secondary"
                    onClick={handleChangeArt}
                    disabled={isLoadingPrints}
                    className="gap-2 shadow-xl"
                   >
                     {isLoadingPrints ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                     Change artwork
                   </Button>
                   <Button
                    type="button"
                    variant="outline" 
                    onClick={() => setIsFullArtOpen(true)}
                    className="gap-2 shadow-xl bg-card border-border hover:bg-card text-foreground"
                   >
                     <Search className="w-4 h-4" />
                     View artwork
                   </Button>
                </div>
              </div>
            ) : (
              <div className="w-full aspect-[2.5/3.5] bg-muted border-2 border-border border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground p-6 text-center hover:border-primary/30 transition-colors">
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
                <Label htmlFor="deckName">Deck name</Label>
                <Input
                  id="deckName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Friday Commander"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="format">Format</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger id="format" className="w-full">
                    <SelectValue placeholder="Select a format" />
                  </SelectTrigger>
                  <SelectContent>
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
                <Label htmlFor="commanderName">Commander</Label>
                <div className="flex gap-2">
                  <Input
                    id="commanderName"
                    value={commanderName}
                    onChange={(e) => setCommanderName(e.target.value)}
                    placeholder="Kenrith, the Returned King"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    aria-label="Search commanders"
                    onClick={handleSearch} 
                    disabled={isSearching || !commanderName}
                    variant="secondary"
                    className="min-w-[3rem]"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="partnerName">Partner (optional)</Label>
              <Input
                id="partnerName"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                placeholder="Optional second commander"
              />
            </div>

            {/* Mobile-only Image Preview */}
            <div className="md:hidden">
              {imageUrl && (
                <div className="mt-2 relative w-full h-80 rounded-xl overflow-hidden border border-border group shadow-lg">
                  <Image
                    src={imageUrl}
                    alt="Commander Art"
                    fill
                    unoptimized
                    className="object-cover object-top"
                  />
                  <div className="absolute bottom-0 left-0 right-0 z-10 bg-card border-t border-border p-3 flex flex-wrap items-center justify-center gap-2">
                    <Button 
                      type="button"
                      variant="secondary"
                      onClick={handleChangeArt}
                      disabled={isLoadingPrints}
                      className="gap-2"
                    >
                      {isLoadingPrints ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                      Change artwork
                    </Button>
                     <Button
                      type="button"
                      variant="outline" 
                      onClick={() => setIsFullArtOpen(true)}
                      className="gap-2 shadow-xl bg-card border-border hover:bg-card text-foreground"
                     >
                       <Search className="w-4 h-4" />
                       View artwork
                     </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Color identity</Label>
              <div className="flex flex-wrap gap-3 p-3 bg-muted rounded-lg border border-border">
                {MTG_COLORS.map((color) => (
                  <div key={color} className="flex items-center space-x-2">
                    <Checkbox
                      id={`color-${color}`}
                      checked={colors.includes(color)}
                      onCheckedChange={(checked) =>
                        handleColorChange(color, checked as boolean)
                      }
                      className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground w-5 h-5"
                    />
                    <label
                      htmlFor={`color-${color}`}
                      className="flex min-h-11 items-center text-sm font-medium text-muted-foreground cursor-pointer select-none"
                    >
                      {color}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-start">
                  <Label htmlFor="description" className="font-medium">Card text / stats</Label>
                  {manaCost && <ManaCost manaCost={manaCost} size={18} />}
              </div>
              
              {oracleText ? (
                 <div className="bg-card border border-border rounded-md p-4 min-h-[150px]">
                    {typeLine && <p className="font-bold text-sm mb-2 border-b border-border pb-2">{typeLine}</p>}
                    <RichTextDisplay text={oracleText} />
                 </div>
              ) : (
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Card text, stats, or notes..."
                  className="bg-card border-border text-muted-foreground min-h-[150px] font-mono text-sm focus-visible:ring-primary/20"
                />
              )}
            </div>

            <div className="pt-4">
              <Button type="submit" className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/10" variant="default" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {initialData ? 'Save changes' : 'Create deck'}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Search Results Dialog - Larger Cards */}
      <Dialog open={isResultsOpen} onOpenChange={setIsResultsOpen}>
        <DialogContent className="sm:max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose a commander</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-2">
            {searchResults.map((card) => (
              <button type="button" aria-label={`Choose ${card.name}`}
                key={card.id} 
                className="cursor-pointer group relative rounded-xl overflow-hidden border-2 border-transparent hover:border-primary transition-all shadow-lg hover:shadow-primary/20"
                onClick={() => handleSelectCard(card)}
              >
                {card.image_uris?.normal ? (
                  <div className="relative aspect-[2.5/3.5] w-full">
                    <Image 
                      src={card.image_uris.normal} 
                      alt={card.name} 
                      fill 
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-[2.5/3.5] bg-card flex items-center justify-center p-4 text-center text-muted-foreground text-sm">
                    No artwork available
                  </div>
                )}
                <div className="relative p-3 bg-card border-t border-border">
                  <p className="text-sm font-semibold text-foreground">{card.name}</p>
                  <p className="text-xs text-muted-foreground">{card.type_line}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Prints Dialog - For Art Selection */}
      <Dialog open={isPrintsOpen} onOpenChange={setIsPrintsOpen}>
        <DialogContent className="sm:max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose artwork</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-2">
            {printResults.map((card) => (
              <button type="button" aria-label={`Choose ${card.set_name}, number ${card.collector_number}`}
                key={card.id} 
                className="cursor-pointer group relative rounded-xl overflow-hidden border-2 border-transparent hover:border-primary transition-all shadow-lg hover:shadow-primary/20"
                onClick={() => handleSelectPrint(card)}
              >
                {card.image_uris?.normal ? (
                  <div className="relative aspect-[2.5/3.5] w-full">
                    <Image 
                      src={card.image_uris.normal} 
                      alt={card.name} 
                      fill 
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-[2.5/3.5] bg-card flex items-center justify-center p-4 text-center text-muted-foreground text-sm">
                    No Image
                  </div>
                )}
                <div className="relative p-3 bg-card border-t border-border">
                  <p className="text-sm font-semibold text-foreground">{card.set_name}</p>
                  <p className="text-xs text-muted-foreground">#{card.collector_number}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {/* Full Art Dialog */}
      <Dialog open={isFullArtOpen} onOpenChange={setIsFullArtOpen}>
        <DialogContent className="max-w-[90vh] h-[90vh] p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center">
            {imageUris?.border_crop || imageUris?.large || imageUris?.normal || imageUrl ? (
              <div className="relative w-full h-full max-h-[85vh] aspect-[2.5/3.5]">
                <Image
                  src={imageUris?.border_crop || imageUris?.large || imageUris?.normal || imageUrl}
                  alt={commanderName}
                  fill
                  unoptimized
                  className="object-contain"
                  priority
                />
              </div>
            ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
