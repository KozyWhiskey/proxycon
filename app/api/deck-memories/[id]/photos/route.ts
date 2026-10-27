import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ownedMemory } from '@/lib/deck-memory-server';
import { normalizeMemoryPhoto } from '@/lib/deck-memory-images';
export const runtime = 'nodejs';
export const maxDuration = 120;
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) {
  try {
    const id = (await context.params).id, ctx = await ownedMemory(id);
    const body = z.object({ purpose: z.enum(['initial','check','additional','recheck']).default('check'), photoId: z.string().uuid().optional() }).parse(await request.json());
    if (body.photoId) {
      const { data } = await ctx.supabase.from('deck_memory_photos').select('*').eq('id', body.photoId).eq('memory_id', id).single();
      if (!data) throw new Error('Photo not found.');
      await normalizeMemoryPhoto(data);
      return NextResponse.json({ success: true });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Photo processing is unavailable. Manual card entry is still available.');
    const { data: photo, error } = await ctx.supabase.rpc('prepare_deck_photo', { p_memory: id, p_purpose: body.purpose });
    if (error || !photo) throw new Error(error?.message || 'Could not prepare upload.');
    const { data: upload, error: uploadError } = await ctx.supabase.storage.from('deck-photos').createSignedUploadUrl(photo.raw_key);
    if (uploadError || !upload) {
      await ctx.supabase.rpc('delete_deck_memory_item', { p_id: id, p_photo: photo.id });
      throw new Error('Could not prepare upload. Please try again.');
    }
    return NextResponse.json({ photoId: photo.id, path: photo.raw_key, token: upload.token });
  } catch(e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not upload the photo.' }, { status: 400 }); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const id = (await context.params).id, ctx = await ownedMemory(id);
    const { photoId } = z.object({ photoId: z.string().uuid() }).parse(await request.json());
    const { error } = await ctx.supabase.rpc('delete_deck_memory_item', { p_id: id, p_photo: photoId });
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch(e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not remove photo.' }, { status: 400 }); }
}
