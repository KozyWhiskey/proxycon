'use client';

import { useState } from 'react';
import { createTournament } from '@/app/tournament/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cardSourceFor, isPodFormat } from '@/lib/activity';
import PlayerSelector from './player-selector';
import { toast } from 'sonner';
import { ScryfallSet } from '@/lib/scryfall';

interface Player {
  id: string;
  display_name: string | null;
  username: string | null;
}

interface TournamentSetupFormProps {
  players: Player[];
  eventId?: string;
  sets: ScryfallSet[];
}

const FORMATS = [
  { value: 'set_draft', label: 'Set draft' },
  { value: 'chaos_draft', label: 'Chaos draft' },
  { value: 'cube', label: 'Cube' },
  { value: 'sealed', label: 'Sealed' },
  { value: 'commander', label: 'Commander' },
  { value: 'two_headed_giant', label: 'Two-Headed Giant' },
  { value: 'free_play', label: 'Free play' },
  { value: 'budget_commander', label: '$15 Commander' },
  { value: 'budget_vintage', label: '$30 Value Vintage' },
];

export default function TournamentSetupForm({ players, eventId, sets }: TournamentSetupFormProps) {
  const [name, setName] = useState('');
  const [format, setFormat] = useState('set_draft');
  const [maxRounds, setMaxRounds] = useState('3');
  const [roundDuration, setRoundDuration] = useState('50');
  const [startsOn, setStartsOn] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedSetCode, setSelectedSetCode] = useState('');
  const [chaosCodes, setChaosCodes] = useState<string[]>([]);
  const [chaosQuery, setChaosQuery] = useState('');
  const [cubeList, setCubeList] = useState('');
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seatCount, setSeatCount] = useState('8');
  const [useRoster, setUseRoster] = useState(false);
  const [productNote, setProductNote] = useState('');
  const [bringing, setBringing] = useState<'me' | 'else' | 'skip'>('skip');

  const source = cardSourceFor(format);
  const pod = isPodFormat(format);

  const handleSubmit = async (e: React.FormEvent, planned = false) => {
    e.preventDefault();
    const sittingName = name.trim() || FORMATS.find((item) => item.value === format)?.label || 'Sitting';
    if (source === 'sets' && chaosCodes.length > 0 && chaosCodes.length < 2) {
      toast.error('Chaos draft needs at least two sets');
      return;
    }

    setIsSubmitting(true);
    const selectedSet = sets.find(s => s.code === selectedSetCode);
    const roster = useRoster ? players.map((player) => player.id) : selectedPlayers;

    try {
      const result = await createTournament({
        name: sittingName,
        playerIds: planned ? [] : selectedPlayers,
        rosterIds: planned ? [] : roster,
        openSeats: planned || pod ? undefined : parseInt(seatCount, 10) || 8,
        format,
        maxRounds: parseInt(maxRounds, 10),
        roundDurationMinutes: parseInt(roundDuration, 10),
        eventId,
        setCode: selectedSet?.code,
        setName: selectedSet?.name,
        setCodes: chaosCodes,
        cubeList,
        startsOn: startsOn || undefined,
        planned,
        productNote,
        bringingProduct: bringing === 'skip' ? undefined : bringing === 'me',
      });

      if (!result.success) {
        toast.error(result.message || 'Failed to create the sitting');
        setIsSubmitting(false);
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'digest' in error) {
        const digest = (error as { digest?: string }).digest;
        if (digest?.startsWith('NEXT_REDIRECT')) return;
      }
      toast.error('An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="font-heading">New sitting</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => handleSubmit(event, false)} className="space-y-6">
          {!pod && (
            <div className="space-y-2">
              <Label htmlFor="seats">Players</Label>
              <Input id="seats" type="number" min={2} max={32} value={seatCount} onChange={(e) => setSeatCount(e.target.value)} className="h-12" />
              <p className="text-xs text-muted-foreground">This many numbered seats. Names can be claimed between rounds.</p>
            </div>
          )}

          {players.length > 0 && !pod && (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={useRoster} onChange={(e) => setUseRoster(e.target.checked)} />
              Put the weekend roster in the first seats
            </label>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional. Friday draft is fine." className="h-12" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startsOn">Day</Label>
            <Input id="startsOn" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} className="h-12" />
          </div>

          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FORMATS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {source === 'set' && (
            <div className="space-y-2">
              <Label>Expansion</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-between h-12">
                    {selectedSetCode ? sets.find(s => s.code === selectedSetCode)?.name : 'Select set'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search set..." />
                    <CommandList>
                      <CommandEmpty>No set found.</CommandEmpty>
                      <CommandGroup>
                        {sets.map((set) => (
                          <CommandItem
                            key={set.id}
                            value={set.code}
                            keywords={[set.name]}
                            onSelect={() => {
                              setSelectedSetCode(set.code === selectedSetCode ? '' : set.code);
                              setOpen(false);
                            }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', selectedSetCode === set.code ? 'opacity-100' : 'opacity-0')} />
                            {set.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {source === 'sets' && (
            <div className="space-y-2">
              <Label>Sets in the chaos draft</Label>
              <Input value={chaosQuery} onChange={(e) => setChaosQuery(e.target.value)} placeholder="Filter sets" className="h-10" />
              <div className="max-h-48 overflow-y-auto rounded-md border border-white/10 p-2 space-y-1">
                {sets.filter(s => s.name.toLowerCase().includes(chaosQuery.toLowerCase())).slice(0, 40).map((set) => {
                  const on = chaosCodes.includes(set.code);
                  return (
                    <button
                      key={set.id}
                      type="button"
                      onClick={() => setChaosCodes(on ? chaosCodes.filter(c => c !== set.code) : [...chaosCodes, set.code])}
                      className={cn('w-full text-left text-sm px-2 py-1 rounded', on ? 'bg-primary/20 text-foreground' : 'text-muted-foreground hover:bg-white/5')}
                    >
                      {set.name}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">{chaosCodes.length} selected. The photo reader will only accept cards from these sets.</p>
            </div>
          )}

          {source === 'cube' && (
            <div className="space-y-2">
              <Label htmlFor="cube">Cube list</Label>
              <Textarea
                id="cube"
                value={cubeList}
                onChange={(e) => setCubeList(e.target.value)}
                placeholder={'One card name per line\nDark Ritual\nSheoldred, the Apocalypse'}
                className="min-h-40 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Paste from Cube Cobra or a text list. Basics can be photographed even if they are not on the list. A second copy of anything else is flagged.</p>
            </div>
          )}

          {!pod && (
            <>
              <div className="space-y-2">
                <Label>Rounds</Label>
                <Select value={maxRounds} onValueChange={setMaxRounds}>
                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 rounds</SelectItem>
                    <SelectItem value="4">4 rounds</SelectItem>
                    <SelectItem value="5">5 rounds</SelectItem>
                    <SelectItem value="6">6 rounds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Round length (minutes)</Label>
                <Input id="duration" type="number" min="1" max="300" value={roundDuration} onChange={(e) => setRoundDuration(e.target.value)} className="h-12" required />
              </div>
            </>
          )}

          <details className="rounded-lg border border-white/10 p-3">
            <summary className="cursor-pointer text-sm text-muted-foreground">More detail, if you want it</summary>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Who brings the product</Label>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant={bringing === 'me' ? 'default' : 'outline'} onClick={() => setBringing('me')}>I&apos;ll bring it</Button>
                  <Button type="button" size="sm" variant={bringing === 'else' ? 'default' : 'outline'} onClick={() => setBringing('else')}>Someone else can</Button>
                </div>
                <Input value={productNote} onChange={(e) => setProductNote(e.target.value)} placeholder="MH3 box, or a cube" className="h-10" />
              </div>
              <div className="space-y-2">
                <Label>Hand-pick seats</Label>
                <PlayerSelector players={players} selectedPlayers={selectedPlayers} onSelectionChange={setSelectedPlayers} />
              </div>
            </div>
          </details>

          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={isSubmitting} className="w-full h-12 font-semibold" variant="default">
              {isSubmitting ? 'Creating...' : 'Start'}
            </Button>
            <Button type="button" variant="outline" className="w-full h-12" disabled={isSubmitting} onClick={(event) => handleSubmit(event, true)}>
              Save for the weekend
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
