'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/get-current-user';

interface DeckActionResult {
  success: boolean;
  message?: string;
  deckId?: string;
}

/**
 * Creates a new deck for the current authenticated user.
 */
export async function createDeck(formData: FormData): Promise<DeckActionResult> {
  const supabase = await createClient();
  const authData = await getCurrentUser();

  if (!authData || !authData.user) {
    return { success: false, message: 'Not authenticated' };
  }

  const name = formData.get('name') as string;
  const format = formData.get('format') as string;
  const colors = formData.getAll('colors') as string[]; // Array of strings
  const commanderName = formData.get('commanderName') as string | null;
  const imageUrl = formData.get('imageUrl') as string | null;
  const description = formData.get('description') as string | null;
  const manaCost = formData.get('manaCost') as string | null;
  const typeLine = formData.get('typeLine') as string | null;
  const oracleText = formData.get('oracleText') as string | null;
  const setCode = formData.get('setCode') as string | null;
  const setName = formData.get('setName') as string | null;
  const imageUrisStr = formData.get('imageUris') as string | null;
  const imageUris = imageUrisStr ? JSON.parse(imageUrisStr) : null;

  if (!name || !format) {
    return { success: false, message: 'Name and Format are required.' };
  }

  // NOTE: Requires 'image_url' and 'description' columns in 'decks' table.
  const { data, error } = await supabase
    .from('decks')
    .insert({
      owner_id: authData.user.id,
      name,
      format,
      colors: colors.length > 0 ? colors : null,
      commander_name: commanderName || null,
      image_url: imageUrl || null,
      description: description || null,
      mana_cost: manaCost || null,
      type_line: typeLine || null,
      oracle_text: oracleText || null,
      set_code: setCode || null,
      set_name: setName || null,
      image_uris: imageUris,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath('/decks');
  return { success: true, deckId: data.id };
}

/**
 * Updates an existing deck owned by the current authenticated user.
 */
export async function updateDeck(deckId: string, formData: FormData): Promise<DeckActionResult> {
  const supabase = await createClient();
  const authData = await getCurrentUser();

  if (!authData || !authData.user) {
    return { success: false, message: 'Not authenticated' };
  }

  const name = formData.get('name') as string;
  const format = formData.get('format') as string;
  const colors = formData.getAll('colors') as string[];
  const commanderName = formData.get('commanderName') as string | null;
  const imageUrl = formData.get('imageUrl') as string | null;
  const description = formData.get('description') as string | null;
  const manaCost = formData.get('manaCost') as string | null;
  const typeLine = formData.get('typeLine') as string | null;
  const oracleText = formData.get('oracleText') as string | null;
  const setCode = formData.get('setCode') as string | null;
  const setName = formData.get('setName') as string | null;
  const imageUrisStr = formData.get('imageUris') as string | null;
  const imageUris = imageUrisStr ? JSON.parse(imageUrisStr) : null;

  if (!name || !format) {
    return { success: false, message: 'Name and Format are required.' };
  }

  const { error } = await supabase
    .from('decks')
    .update({
      name,
      format,
      colors: colors.length > 0 ? colors : null,
      commander_name: commanderName || null,
      image_url: imageUrl || null,
      description: description || null,
      mana_cost: manaCost || null,
      type_line: typeLine || null,
      oracle_text: oracleText || null,
      set_code: setCode || null,
      set_name: setName || null,
      image_uris: imageUris,
    })
    .eq('id', deckId)
    .eq('owner_id', authData.user.id); // Ensure ownership

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath('/decks');
  return { success: true };
}

/**
 * Deletes a deck owned by the current authenticated user.
 */
export async function deleteDeck(deckId: string): Promise<DeckActionResult> {
  const supabase = await createClient();
  const authData = await getCurrentUser();

  if (!authData || !authData.user) {
    return { success: false, message: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('decks')
    .delete()
    .eq('id', deckId)
    .eq('owner_id', authData.user.id); // Ensure ownership

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath('/decks');
  return { success: true };
}

/**
 * Fetches all decks for the current authenticated user.
 */
export async function getUsersDecks(): Promise<{ decks: any[] | null; error?: string }> {
  const supabase = await createClient();
  const authData = await getCurrentUser();

  if (!authData || !authData.user) {
    return { decks: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .eq('owner_id', authData.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return { decks: null, error: error.message };
  }

  return { decks: data };
}
