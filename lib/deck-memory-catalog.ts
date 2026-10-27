import 'server-only';
import type { MemoryCard } from './deck-memory';
import { manualCard, normalizedName } from './deck-memory';
import { memoryAdmin } from './deck-memory-admin';

type CatalogCard = {
  id: string; oracle_id?: string; name: string; type_line?: string;
  image_uris?: { normal?: string; art_crop?: string }; card_faces?: { name: string; image_uris?: { normal?: string; art_crop?: string } }[];
  set?: string;
};

async function scryfall<T = CatalogCard>(path: string): Promise<T | null> {
  const admin = memoryAdmin();
  const { data: next, error } = await admin.rpc('lease_deck_catalog_request');
  if (error) throw new Error('Card catalog is temporarily unavailable. Try again or enter the name manually.');
  const wait = Math.max(0, new Date(next).getTime() - Date.now());
  if (wait > 8000) throw new Error('Card catalog is busy. Try again shortly.');
  if (wait) await new Promise(resolve => setTimeout(resolve, wait));
  const response = await fetch(`https://api.scryfall.com${path}`, {
    headers: { 'User-Agent': 'ProxyCon/1.0 (Limited deck memories)', Accept: 'application/json' },
    signal: AbortSignal.timeout(8000), cache: 'no-store',
  });
  if (response.status === 404) return null;
  // Back off across processes, rather than powering through a 429.
  if (response.status === 429) {
    await admin.from('deck_catalog_rate').update({ next_at: new Date(Date.now() + 30_000).toISOString() }).eq('id', true);
    throw new Error('Card catalog is busy. Try again in a moment.');
  }
  if (!response.ok) throw new Error('Card catalog is temporarily unavailable.');
  return response.json();
}

function catalogMemoryCard(found: CatalogCard, count = 1, verified = true): MemoryCard {
  return { key: found.oracle_id || normalizedName(found.name), name: found.name, count,
    oracleId: found.oracle_id || null, printingId: found.id,
    imageUrl: found.image_uris?.normal || found.card_faces?.[0]?.image_uris?.normal || null,
    typeLine: found.type_line || '', verified, edited: false, sources: [] };
}

/** Obtain the actual printing's artwork URI, not a guessed image-host path. */
export async function memoryShowcaseArtwork(card: MemoryCard): Promise<string | null> {
  if(!card.printingId||!/^[0-9a-f-]{36}$/i.test(card.printingId)) return card.imageUrl;
  const admin=memoryAdmin(),lookup=`art:${card.printingId}`;
  const {data:cached}=await admin.from('deck_card_catalog').select('card,updated_at').eq('lookup_key',lookup).maybeSingle();
  if(cached&&Date.now()-Date.parse(cached.updated_at)<7*86400_000) return cached.card.artUrl||card.imageUrl;
  const found=await scryfall(`/cards/${encodeURIComponent(card.printingId)}`);
  const artUrl=found?.image_uris?.art_crop||found?.card_faces?.[0]?.image_uris?.art_crop||null;
  if(artUrl) {
    const url=new URL(artUrl);
    if(url.protocol!=='https:'||url.hostname!=='cards.scryfall.io') return card.imageUrl;
    await admin.from('deck_card_catalog').upsert({lookup_key:lookup,card:{artUrl},updated_at:new Date().toISOString()});
  }
  return artUrl||card.imageUrl;
}

/** Cache set membership by canonical identity, rather than requiring a particular printing. */
export async function tournamentCardPool(setCodes: string[]) {
  const codes = [...new Set(setCodes.filter(code=>/^[a-z0-9]{2,8}$/i.test(code)).map(code=>code.toLowerCase()))].sort();
  if (!codes.length) return null;
  const admin = memoryAdmin(), lookup = `pool:${codes.join(',')}`;
  const { data: cached } = await admin.from('deck_card_catalog').select('card,updated_at').eq('lookup_key', lookup).maybeSingle();
  if (cached && Date.now() - Date.parse(cached.updated_at) < 86400_000) return cached.card as { names: string[]; oracleIds: string[]; complete: boolean };
  const cards: CatalogCard[] = [];
  let path: string | null = `/cards/search?q=${encodeURIComponent(`(${codes.map(code=>`set:${code}`).join(' or ')})`)}&unique=cards`;
  for (let page=0; path && page<15; page++) {
    const result = await scryfall<{ data: CatalogCard[]; has_more: boolean; next_page?: string }>(path);
    if (!result) break;
    cards.push(...result.data);
    if (result.has_more && result.next_page) {
      const next: URL = new URL(result.next_page);
      if (next.hostname !== 'api.scryfall.com') throw new Error('Invalid catalog page.');
      path = `${next.pathname}${next.search}`;
    } else path = null;
  }
  const pool = { names: [...new Set(cards.map(c=>c.name))], oracleIds: [...new Set(cards.flatMap(c=>c.oracle_id?[c.oracle_id]:[]))], complete: path === null };
  if (!cards.length) return null;
  await admin.from('deck_card_catalog').upsert([
    { lookup_key:lookup,card:pool,updated_at:new Date().toISOString() },
    ...cards.map(c=>({lookup_key:normalizedName(c.name),card:catalogMemoryCard(c),updated_at:new Date().toISOString()})),
  ]);
  return pool;
}

export async function resolveMemoryCard(name: string, count = 1): Promise<MemoryCard> {
  const admin = memoryAdmin();
  const lookup = normalizedName(name);
  const { data: cached } = await admin.from('deck_card_catalog').select('card,updated_at').eq('lookup_key', lookup).maybeSingle();
  if (cached && Date.now() - Date.parse(cached.updated_at) < 7 * 86400_000) return { ...cached.card, count };
  let found = await scryfall(`/cards/named?exact=${encodeURIComponent(name)}`);
  let exact = Boolean(found);
  if (!found) found = await scryfall(`/cards/named?fuzzy=${encodeURIComponent(name)}`);
  if (!found) return manualCard(name, count);
  exact = exact || normalizedName(found.name) === lookup || Boolean(found.card_faces?.some(f => normalizedName(f.name) === lookup));
  const card = catalogMemoryCard(found, count, exact);
  await admin.from('deck_card_catalog').upsert({ lookup_key: lookup, card, updated_at: new Date().toISOString() });
  return card;
}
