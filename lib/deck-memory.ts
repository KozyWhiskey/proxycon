/** Shared, deterministic deck comparison. No provider calls or browser state. */
export type DeckProvider = 'google' | 'openai';
export type ReaderChoice = DeckProvider | 'both';
export type PhotoPurpose = 'initial' | 'check' | 'additional' | 'recheck';
export type Region = { x: number; y: number; width: number; height: number };
export type DeckCategory = { id: string; name: string; zone: 'main' | 'sideboard'; order: number };
export type CardAllocation = { categoryId: string; count: number };
export type MemoryCard = {
  showcase?: boolean;
  key: string;
  name: string;
  count: number;
  oracleId: string | null;
  printingId: string | null;
  imageUrl: string | null;
  typeLine: string;
  verified: boolean;
  edited: boolean;
  sources: string[];
  allocations?: CardAllocation[];
};
export type Observation = {
  name: string;
  title: string;
  count: number;
  region: Region;
  uncertainName: boolean;
  uncertainCount: boolean;
  card: MemoryCard;
};
export type ProviderAttempt = {
  id: string;
  photo_id: string;
  provider: DeckProvider;
  model: string;
  status: 'processing' | 'ready' | 'failed';
  observations: Observation[];
  error_category: string | null;
  created_at: string;
  analysis_key: string;
};
export type Suggestion = {
  id: string;
  kind: 'add' | 'quantity' | 'overlap' | 'review';
  card: MemoryCard;
  currentCount: number;
  observedCount: number;
  agreed: boolean;
  reasons: string[];
  photoId: string;
  region: Region;
  alternatives: string[];
};
export type MemoryPhoto = {
  id: string;
  purpose: PhotoPurpose;
  status: string;
  url: string | null;
  width: number | null;
  height: number | null;
};
export type DeckMemory = {
  id: string;
  tournament_id: string;
  event_id: string;
  profile_id: string;
  title: string;
  note: string;
  status: 'pending' | 'confirmed';
  incomplete: boolean;
  shared: boolean;
  revision: number;
  confirmed_revision?:number|null;
  created_at: string;
  updated_at: string;
  cards: MemoryCard[];
  decisions: Record<string, 'accepted' | 'dismissed'>;
  categories?: DeckCategory[];
};

export const BASIC_NAMES = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'];
export function normalizedName(name: string) {
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
export function cardKey(card: Pick<MemoryCard, 'oracleId' | 'name'>) {
  return card.oracleId || normalizedName(card.name);
}
export function sameCard(a: Pick<MemoryCard, 'oracleId' | 'name'>, b: Pick<MemoryCard, 'oracleId' | 'name'>) {
  return a.oracleId && b.oracleId ? a.oracleId === b.oracleId : normalizedName(a.name) === normalizedName(b.name);
}
export function manualCard(name: string, count = 1): MemoryCard {
  return { key: normalizedName(name), name: name.trim(), count, oracleId: null, printingId: null, imageUrl: null, typeLine: '', verified: false, edited: true, sources: [] };
}
export function isLand(card: MemoryCard) {
  return /\bland\b/i.test(card.typeLine.split('//')[0]) || /^(snow-covered )?(plains|island|swamp|mountain|forest|wastes)$/i.test(card.name);
}
export const DECK_CARD_GROUPS = ['Creatures', 'Instants', 'Sorceries', 'Artifacts', 'Enchantments', 'Planeswalkers', 'Lands', 'Other'] as const;
export function deckCardGroup(card: MemoryCard): typeof DECK_CARD_GROUPS[number] {
  const types = card.typeLine.split('//')[0].split(/[—–]/)[0];
  if (isLand(card)) return 'Lands';
  if (/\bcreature\b/i.test(types)) return 'Creatures';
  if (/\bplaneswalker\b/i.test(types)) return 'Planeswalkers';
  if (/\binstant\b/i.test(types)) return 'Instants';
  if (/\bsorcery\b/i.test(types)) return 'Sorceries';
  if (/\bartifact\b/i.test(types)) return 'Artifacts';
  if (/\benchantment\b/i.test(types)) return 'Enchantments';
  return 'Other';
}
/** Undo only this review's changed rows. Later manual changes must never be reset. */
export function undoReviewCards(current: MemoryCard[], before: MemoryCard[], after: MemoryCard[]): MemoryCard[] | null {
  const previous = new Map(before.map(c => [cardKey(c), c]));
  const next = new Map(after.map(c => [cardKey(c), c]));
  const changed = new Set([...previous.keys(), ...next.keys()].filter(key => JSON.stringify(previous.get(key)) !== JSON.stringify(next.get(key))));
  const now = new Map(current.map(c => [cardKey(c), c]));
  if ([...changed].some(key => JSON.stringify(now.get(key)) !== JSON.stringify(next.get(key)))) return null;
  return [...current.filter(c => !changed.has(cardKey(c))), ...before.filter(c => changed.has(cardKey(c)))];
}
export function deckText(cards: MemoryCard[]) {
  return cards.filter(c => c.count > 0).map(c => `${c.count} ${c.name}`).join('\n');
}

/** Compare one analysis group only. Rechecks never manufacture two-provider agreement. */
export function comparePhoto(
  attempts: ProviderAttempt[], cards: MemoryCard[], purpose: PhotoPurpose,
  photoId: string, analysisKey: string, choice: ReaderChoice, categories: DeckCategory[] = [],
): Suggestion[] {
  const perProvider = new Map<DeckProvider, ProviderAttempt>();
  for (const a of attempts.filter(a => a.analysis_key === analysisKey)) perProvider.set(a.provider, a);
  const ready = [...perProvider.values()].filter(a => a.status === 'ready');
  const groups = new Map<string, { observation: Observation; provider: DeckProvider }[]>();
  for (const attempt of ready) {
    // Providers sometimes repeat a card row. Use the largest count, never sum guesses.
    const unique = new Map<string, Observation>();
    for (const observation of attempt.observations) {
      const key = cardKey(observation.card);
      if (!unique.has(key) || unique.get(key)!.count < observation.count) unique.set(key, observation);
    }
    for (const [key, observation] of unique) groups.set(key, [...(groups.get(key) || []), { observation, provider: attempt.provider }]);
  }
  return [...groups.entries()].map(([key, entries]): Suggestion | null => {
    const first = entries[0].observation;
    const stored = cards.find(c => sameCard(c, first.card));
    const existing = stored ? {...stored,count:stored.count-sideCopies(stored,categories)} : undefined;
    const counts = [...new Set(entries.map(e => e.observation.count))];
    const agreed = choice === 'both' && new Set(entries.map(e => e.provider)).size === 2 && counts.length === 1
      && entries.every(e => !e.observation.uncertainName && !e.observation.uncertainCount);
    const reasons = new Set<string>();
    if (choice === 'both' && entries.length < 2) reasons.add('Found by one model');
    if (counts.length > 1 || entries.some(e => e.observation.uncertainCount)) reasons.add('Check quantity');
    if (entries.some(e => e.observation.uncertainName || !e.observation.card.verified)) reasons.add('Check name');
    // Nearby conflicting regions are candidate names, not extra cards to merge blindly.
    const alternatives: string[] = [];
    for (const [otherKey, otherEntries] of groups) {
      if (otherKey === key) continue;
      for (const other of otherEntries) {
        if (other.provider === entries[0].provider) continue;
        const a = first.region, b = other.observation.region;
        const intersection = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
          * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
        if (intersection / Math.max(0.0001, Math.min(a.width * a.height, b.width * b.height)) > 0.55) {
          alternatives.push(other.observation.card.name);
          reasons.add('Possible name correction');
        }
      }
    }
    if (existing && existing.count === first.count && purpose !== 'additional' && reasons.size === 0) return null;
    const kind = !existing ? 'add' : purpose === 'additional' ? 'overlap' : existing.count !== first.count ? 'quantity' : 'review';
    return {
      id: `${analysisKey}:${key}`, kind, card: { ...first.card, sources: [photoId] },
      currentCount: existing?.count || 0, observedCount: first.count, agreed,
      reasons: [...reasons], photoId, region: first.region, alternatives: [...new Set(alternatives)],
    };
  }).filter((s): s is Suggestion => s !== null);
}

/** Always applies to the latest list. Absence in a photo can never remove a card. */
function sideCopies(card: MemoryCard,categories: DeckCategory[]) { const ids=new Set(['sideboard',...categories.filter(c=>c.zone==='sideboard').map(c=>c.id)]); return (card.allocations||[]).filter(a=>ids.has(a.categoryId)).reduce((s,a)=>s+a.count,0); }
export function applySuggestion(cards: MemoryCard[], suggestion: Suggestion, mode: 'observed' | 'additional' = 'observed', categories: DeckCategory[] = []) {
  const index = cards.findIndex(c => sameCard(c, suggestion.card));
  const previous = cards[index];
  const side=previous ? sideCopies(previous,categories) : 0;
  const assignedMain=previous ? (previous.allocations||[]).reduce((sum,a)=>sum+a.count,0)-side : 0;
  if (mode==='observed'&&suggestion.observedCount<assignedMain) throw new Error('This quantity is below copies assigned to main-deck categories. Move those copies before applying this reading.');
  const updated = { ...suggestion.card, ...previous,
    oracleId: previous?.oracleId || suggestion.card.oracleId, printingId: previous?.printingId || suggestion.card.printingId,
    imageUrl: previous?.imageUrl || suggestion.card.imageUrl, typeLine: previous?.typeLine || suggestion.card.typeLine,
    count: mode === 'additional' ? (previous?.count || 0) + suggestion.observedCount : suggestion.observedCount + side,
    edited: true, sources: [...new Set([...(previous?.sources || []), suggestion.photoId])] };
  return index < 0 ? [...cards, updated] : cards.map((c, i) => i === index ? updated : c);
}
