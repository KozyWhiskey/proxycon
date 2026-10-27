import 'server-only';
import { resolvePlayer } from './player-session';
import { deckMemoriesEnabled, readerConfiguration } from './deck-memory-config';
import { comparePhoto, type DeckMemory, type MemoryPhoto, type ProviderAttempt, type PhotoPurpose, type ReaderChoice } from './deck-memory';

export async function memoryContext() {
  if (!deckMemoriesEnabled()) throw new Error('Deck memories are not enabled yet.');
  const ctx = await resolvePlayer();
  if (!ctx.playerId || ctx.mode === 'house') throw new Error('Choose your name to open deck memories.');
  return ctx;
}
export async function ownedMemory(id: string) {
  const ctx = await memoryContext();
  const { data, error } = await ctx.supabase.from('event_decks').select('*').eq('id', id).eq('profile_id', ctx.playerId).maybeSingle();
  if (error || !data) throw new Error('Your deck memory was not found.');
  return { ...ctx, memory: data as DeckMemory };
}

export async function loadMemory(id: string) {
  const ctx = await memoryContext();
  const { data: raw, error } = await ctx.supabase.from('event_decks').select('*').eq('id', id).maybeSingle();
  if (error || !raw) throw new Error('Deck memory not found or private.');
  const memory = raw as DeckMemory;
  const owner = memory.profile_id === ctx.playerId;
  const [{ data: photos }, { data: attempts }, { data: tournament }] = await Promise.all([
    ctx.supabase.from('deck_memory_photos').select('*').eq('memory_id', id).order('created_at'),
    owner ? ctx.supabase.from('deck_memory_attempts').select('id,photo_id,provider,model,status,observations,warnings,error_category,created_at,analysis_key,purpose,selection,baseline_revision,region,latency_ms,input_tokens,output_tokens').eq('memory_id', id).order('created_at') : Promise.resolve({ data: [] }),
    ctx.supabase.from('tournaments').select('name,status').eq('id', memory.tournament_id).single(),
  ]);
  const pictures: MemoryPhoto[] = await Promise.all((photos || []).map(async p => {
    const key = p.normalized_key || (owner ? p.raw_key : null);
    const signed = key ? await ctx.supabase.storage.from('deck-photos').createSignedUrl(key, 600) : null;
    return { id: p.id, purpose: p.purpose, status: p.status, width: p.width, height: p.height, url: signed?.data?.signedUrl || null };
  }));
  const groups: { key: string; photoId: string; choice: ReaderChoice; purpose: PhotoPurpose; baseline: number; incomplete: boolean; suggestions: ReturnType<typeof comparePhoto> }[] = [];
  // Latest analysis per photo; older observations stay available for evidence/audit.
  for (const photo of pictures) {
    const forPhoto = (attempts || []).filter(a => a.photo_id === photo.id);
    const latest = forPhoto.at(-1);
    if (!latest) continue;
    const group = forPhoto.filter(a => a.analysis_key === latest.analysis_key);
    const providers = new Set(group.filter(a => a.status === 'ready').map(a => a.provider));
    groups.push({ key: latest.analysis_key, photoId: photo.id, choice: latest.selection, purpose: latest.purpose,
      baseline: latest.baseline_revision, incomplete: latest.selection === 'both' && providers.size < 2,
      suggestions: comparePhoto(group as ProviderAttempt[], memory.cards, latest.purpose, photo.id, latest.analysis_key, latest.selection, memory.categories)
        .filter(s => !memory.decisions[s.id]),
    });
  }
  return { memory, owner, photos: pictures, attempts: attempts || [], groups, tournament,
    readers: readerConfiguration(), photoProcessing: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) };
}
