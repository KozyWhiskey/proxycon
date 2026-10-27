import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ownedMemory, loadMemory } from '@/lib/deck-memory-server';
import { memoryAdmin } from '@/lib/deck-memory-admin';
import { readerConfiguration, positiveSetting } from '@/lib/deck-memory-config';
import { recognitionImage } from '@/lib/deck-memory-images';
import { poolHint, readMemoryPhoto, outsideCube } from '@/lib/deck-memory-reader';
import type { DeckProvider } from '@/lib/deck-memory';
import { tournamentCardPool } from '@/lib/deck-memory-catalog';
import { deckReaderFailure, deckReaderFailureMessage, deckReaderDiagnostics } from '@/lib/deck-memory-errors';
import { isBasicLand } from '@/lib/activity';
export const runtime = 'nodejs';
export const maxDuration = 120;
const schema = z.object({ photoId: z.string().uuid(), choice: z.enum(['google','openai','both']), key: z.string().uuid(),
  purpose: z.enum(['initial','check','additional','recheck']), revision: z.number().int().min(0),
  retryOf: z.string().uuid().optional(),
  region: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().min(0.001).max(1), height: z.number().min(0.001).max(1) }).optional() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const id = (await context.params).id, ctx = await ownedMemory(id);
    const input = schema.parse(await request.json());
    let groupKey = input.key;
    let providers: DeckProvider[] = input.choice === 'both' ? ['google','openai'] : [input.choice];
    if (input.retryOf) {
      const { data: previous } = await ctx.supabase.from('deck_memory_attempts').select('*').eq('id', input.retryOf).eq('memory_id', id).eq('photo_id', input.photoId).single();
      if (!previous || previous.status === 'ready') throw new Error('Only an unfinished reading can be retried.');
      const { data: latestProvider } = await ctx.supabase.from('deck_memory_attempts').select('id').eq('analysis_key', previous.analysis_key).eq('provider', previous.provider).order('created_at', { ascending: false }).limit(1).single();
      if (latestProvider?.id !== previous.id) throw new Error('A newer reading already exists. Reload to see it.');
      if (previous.status === 'processing' && Date.now() - Date.parse(previous.created_at) < 180_000) throw new Error('This reader is still processing. Try again in a moment.');
      groupKey = previous.analysis_key;
      providers = [previous.provider as DeckProvider];
      input.choice = previous.selection;
      input.purpose = previous.purpose;
      input.region = previous.region || undefined;
    }
    const configuration = readerConfiguration();
    if (providers.some(p => !configuration[p].available)) throw new Error('A selected reader is unavailable. Choose an available reader.');
    const admin = memoryAdmin();
    const { data: photo } = await ctx.supabase.from('deck_memory_photos').select('*').eq('id', input.photoId).eq('memory_id', id).single();
    if (!photo?.recognition_key || photo.status !== 'ready') throw new Error('Finish uploading this photo first.');
    const { data: tournament } = await ctx.supabase.from('tournaments').select('set_codes,set_code,cube_list,singleton').eq('id', ctx.memory.tournament_id).single();
    const pool = await tournamentCardPool(tournament?.set_codes?.length ? tournament.set_codes : tournament?.set_code ? [tournament.set_code] : []).catch(()=>null);
    // Download only the owned persisted object; never accept an external URL.
    const bytes = await recognitionImage(input.region ? photo.normalized_key : photo.recognition_key, input.region);
    const outcomes = await Promise.all(providers.map(async provider => {
      const config = configuration[provider];
      const { data: attempt, error } = await admin.rpc('reserve_deck_analysis', {
        p_memory: id, p_photo: photo.id, p_player: ctx.playerId, p_provider: provider, p_model: config.model,
        p_key: input.key, p_group: groupKey, p_purpose: input.purpose, p_selection: input.choice, p_revision: input.revision,
        p_region: input.region || null,
        p_reserve: positiveSetting('DECK_CALL_RESERVE_USD', 0.25), p_budget: positiveSetting('DECK_EVENT_BUDGET_USD', 10),
        p_hour_limit: positiveSetting('DECK_PLAYER_HOURLY_CALLS', 10),
      });
      if (error || !attempt) return { provider, error: error?.message || 'Could not start reading.' };
      // Only the request that created the reservation may dispatch. A fresh RPC result
      // is claimed atomically before work, so retries cannot issue duplicate paid calls.
      const { data: claim } = await admin.from('deck_memory_attempts').update({ error_category: 'running', prompt_version: provider === 'google' ? 'deck-memory-v2-google-boxes' : 'deck-memory-v1' })
        .eq('id', attempt.id).eq('status', 'processing').is('error_category', null).select('id').maybeSingle();
      if (!claim) return { provider, status: attempt.status };
      const started = Date.now();
      try {
        const result = await readMemoryPhoto(provider, bytes, poolHint(tournament || {}) + (pool ? `\nSet card names: ${pool.names.join('\n')}` : ''));
        for (const observation of result.observations) {
          if (pool?.complete && observation.card.oracleId && !pool.oracleIds.includes(observation.card.oracleId) && !isBasicLand(observation.card.name)) observation.uncertainName = true;
          if (outsideCube(observation.card.name, tournament?.cube_list) && !/^(snow-covered )?(plains|island|swamp|mountain|forest|wastes)$/i.test(observation.card.name)) observation.uncertainName = true;
          if (tournament?.singleton && observation.count > 1 && !/\bbasic\b/i.test(observation.card.typeLine)) observation.uncertainCount = true;
          if (input.region) {
            observation.region = { x: input.region.x + observation.region.x * input.region.width, y: input.region.y + observation.region.y * input.region.height,
              width: observation.region.width * input.region.width, height: observation.region.height * input.region.height };
          }
        }
        const inputTokens = result.usage.inputTokens || 0, outputTokens = result.usage.outputTokens || 0;
        const inputRate = positiveSetting(provider === 'google' ? 'DECK_GOOGLE_INPUT_USD_PER_M' : 'DECK_OPENAI_INPUT_USD_PER_M', provider === 'google' ? 1.5 : 2);
        const outputRate = positiveSetting(provider === 'google' ? 'DECK_GOOGLE_OUTPUT_USD_PER_M' : 'DECK_OPENAI_OUTPUT_USD_PER_M', provider === 'google' ? 7.5 : 10);
        const cost = (inputTokens * inputRate + outputTokens * outputRate) / 1e6;
        const { error: finishError } = await admin.from('deck_memory_attempts').update({ status: 'ready', observations: result.observations, warnings: result.warnings,
          input_tokens: inputTokens, output_tokens: outputTokens, actual_usd: cost || null, latency_ms: result.latency,
          error_category: null, completed_at: new Date().toISOString() }).eq('id', attempt.id);
        if (finishError) throw new Error('Result could not be saved.');
        return { provider, status: 'ready' };
      } catch (error) {
        const category = deckReaderFailure(error);
        await admin.from('deck_memory_attempts').update({ status: 'failed', error_category: category, warnings: deckReaderDiagnostics(error), latency_ms: Date.now() - started, completed_at: new Date().toISOString() }).eq('id', attempt.id);
        return { provider, error: deckReaderFailureMessage(category) };
      }
    }));
    return NextResponse.json({ ...(await loadMemory(id)), outcomes });
  } catch(e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not read the photo.' }, { status: 400 }); }
}
