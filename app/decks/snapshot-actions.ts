'use server';

import { createClient } from '@/utils/supabase/server';
import { resolvePlayer } from '@/lib/player-session';
import { revalidatePath } from 'next/cache';
import { readCardsFromPhotos, resolveDeckCards, ResolvedDeckCard } from '@/lib/deck-read';
import { isBasicLand } from '@/lib/activity';
import { searchCard, searchCards } from '@/lib/scryfall';

export interface DeckPhotoResult {
  success: boolean;
  message?: string;
  photoPaths?: string[];
  cards?: ResolvedDeckCard[];
}

async function loadUniverse(tournamentId: string) {
  const supabase = await createClient();
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, event_id, format, card_source, set_code, set_codes, cube_list, singleton')
    .eq('id', tournamentId)
    .single();
  return { supabase, tournament };
}

export async function identifyDeckPhotos(tournamentId: string, formData: FormData): Promise<DeckPhotoResult> {
  try {
    const ctx = await resolvePlayer();
    if (!ctx.playerId) return { success: false, message: 'Choose your name first.' };
    const { supabase, tournament } = { supabase: ctx.supabase, tournament: (await loadUniverse(tournamentId)).tournament };
    if (!tournament) return { success: false, message: 'Sitting not found' };

    const files = formData.getAll('photos').filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (files.length === 0) return { success: false, message: 'Add a photo of the deck' };
    if (files.length > 2) return { success: false, message: 'Use at most two photos' };

    const photoPaths: string[] = [];
    const images: { bytes: Uint8Array; mediaType: string }[] = [];

    for (const [index, file] of files.entries()) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      images.push({ bytes, mediaType: file.type || 'image/jpeg' });
      const path = `${tournamentId}/${ctx.playerId}/${Date.now()}-${index}.jpg`;
      const { error } = await supabase.storage.from('deck-photos').upload(path, bytes, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });
      if (error) {
        return { success: false, message: `${error.message}. Run scripts/sql/weekend_house.sql if the deck-photos bucket is missing.` };
      }
      photoPaths.push(supabase.storage.from('deck-photos').getPublicUrl(path).data.publicUrl);
    }

    const setCodes = tournament.set_codes?.length
      ? tournament.set_codes
      : tournament.set_code
        ? [tournament.set_code]
        : [];
    const cubeNames = tournament.cube_list
      ? tournament.cube_list.split('\n').map((line: string) => line.trim()).filter(Boolean)
      : null;

    if (tournament.card_source === 'none') {
      return { success: true, photoPaths, cards: [] };
    }

    const hint = cubeNames
      ? `Prefer these cube names:\n${cubeNames.slice(0, 800).join('\n')}`
      : setCodes.length
        ? `Only cards from sets: ${setCodes.join(', ')}. Basics are allowed.`
        : 'Any Magic card is allowed.';

    const raw = await readCardsFromPhotos(images, hint);
    const cards = await resolveDeckCards(raw, {
      setCodes: tournament.card_source === 'cube' ? [] : setCodes,
      cubeNames,
      singleton: !!tournament.singleton,
    });

    return { success: true, photoPaths, cards };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Could not read the photo' };
  }
}

export async function searchSnapshotCard(tournamentId: string, query: string): Promise<DeckPhotoResult> {
  try {
    const { tournament } = await loadUniverse(tournamentId);
    if (!tournament) return { success: false, message: 'Sitting not found' };
    const setCodes = tournament.card_source === 'cube'
      ? []
      : (tournament.set_codes?.length ? tournament.set_codes : tournament.set_code ? [tournament.set_code] : []);
    const clause = setCodes.length && !isBasicLand(query) ? ` (${setCodes.map((code: string) => `set:${code}`).join(' OR ')})` : '';
    const found = await searchCards(`!"${query.replace(/"/g, '')}"${clause}`);
    const card = found[0] || await searchCard(query);
    if (!card) return { success: false, message: 'No card matched' };
    return {
      success: true,
      cards: [{
        name: card.name,
        count: 1,
        scryfallId: card.id,
        setCode: card.set || null,
        collectorNumber: card.collector_number || null,
        imageUrl: card.image_uris?.normal || null,
        flagged: false,
      }],
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Search failed' };
  }
}

export async function saveDeckSnapshot(input: {
  tournamentId: string;
  photoPaths: string[];
  cards: ResolvedDeckCard[];
}): Promise<DeckPhotoResult> {
  try {
    const ctx = await resolvePlayer();
    if (!ctx.playerId) return { success: false, message: 'Choose your name first.' };
    const { tournament } = await loadUniverse(input.tournamentId);
    const supabase = ctx.supabase;
    if (!tournament) return { success: false, message: 'Sitting not found' };
    if (input.cards.length === 0) return { success: false, message: 'The list is empty' };

    const { data: deck, error } = await supabase.from('event_decks').insert({
      event_id: tournament.event_id,
      tournament_id: tournament.id,
      profile_id: ctx.playerId,
      photo_paths: input.photoPaths,
      status: 'confirmed',
    }).select('id').single();
    if (error || !deck) return { success: false, message: error?.message || 'Could not save the deck' };

    const rows = input.cards.map((card) => ({
      event_deck_id: deck.id,
      name: card.name,
      scryfall_id: card.scryfallId,
      set_code: card.setCode,
      collector_number: card.collectorNumber,
      count: card.count,
      image_url: card.imageUrl,
      flagged: card.flagged,
    }));
    const { error: cardError } = await supabase.from('event_deck_cards').insert(rows);
    if (cardError) return { success: false, message: cardError.message };

    revalidatePath(`/tournament/${tournament.id}/deck`);
    if (tournament.event_id) revalidatePath(`/events/${tournament.event_id}`);
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Could not save the deck' };
  }
}

export async function saveLibraryDeckPhoto(input: {
  tournamentId: string;
  deckId: string;
  photoPaths: string[];
}): Promise<DeckPhotoResult> {
  try {
    const ctx = await resolvePlayer();
    if (!ctx.playerId) return { success: false, message: 'Choose your name first.' };
    const { tournament } = await loadUniverse(input.tournamentId);
    const supabase = ctx.supabase;
    if (!tournament) return { success: false, message: 'Sitting not found' };

    const { data: deck } = await supabase.from('decks').select('id, name, commander_name, image_url').eq('id', input.deckId).eq('owner_id', ctx.playerId).single();
    if (!deck) return { success: false, message: 'Pick one of your decks' };

    const { data: snapshot, error } = await supabase.from('event_decks').insert({
      event_id: tournament.event_id,
      tournament_id: tournament.id,
      profile_id: ctx.playerId,
      photo_paths: input.photoPaths,
      status: 'confirmed',
    }).select('id').single();
    if (error || !snapshot) return { success: false, message: error?.message || 'Could not save' };

    await supabase.from('event_deck_cards').insert({
      event_deck_id: snapshot.id,
      name: deck.commander_name || deck.name,
      count: 1,
      image_url: deck.image_url,
      flagged: false,
    });

    revalidatePath(`/tournament/${tournament.id}/deck`);
    return { success: true };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Could not save' };
  }
}
