'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { safeNext } from '@/lib/continuation';
import { createClient } from '@/utils/supabase/server';

export interface PlayerActionResult {
  success: boolean;
  message: string;
}

function cleanName(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function chooseProfile(formData: FormData) {
  const profileId = cleanName(formData.get('profileId'));
  const supabase = await createClient();
  const { error } = await supabase.rpc('assume_profile', { p_profile_id: profileId });
  if (error) return { success: false, message: error.message };
  revalidatePath('/', 'layout');
  redirect(safeNext(formData.get('next')));
}

export async function chooseHouse(next?: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc('assume_house');
  if (error) return { success: false, message: error.message };
  revalidatePath('/', 'layout');
  redirect(safeNext(next));
}

export async function createPlaygroupProfile(formData: FormData): Promise<PlayerActionResult> {
  const name = cleanName(formData.get('name'));
  const bind = formData.get('bind') === '1';
  if (name.length < 1 || name.length > 60) {
    return { success: false, message: 'Enter a play name of 1 to 60 characters.' };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Open the home screen and try again.' };

  const { data, error } = await supabase.rpc('create_roster_profile', {
    p_display_name: name,
    p_bind: bind,
  });
  if (error) return { success: false, message: error.message };

  const created = Boolean(data && typeof data === 'object' && 'created' in data && data.created);
  revalidatePath('/', 'layout');
  revalidatePath('/admin');
  revalidatePath('/players');
  if (bind && user.is_anonymous) redirect(safeNext(formData.get('next')));
  if (!created) return { success: true, message: `${name} is already on the list.` };
  return { success: true, message: `${name} is on the list.` };
}
