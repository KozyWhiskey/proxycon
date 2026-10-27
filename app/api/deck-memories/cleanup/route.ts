import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { memoryAdmin } from '@/lib/deck-memory-admin';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const expected = process.env.DECK_CLEANUP_SECRET;
  const supplied = request.headers.get('authorization') || '';
  const expectedBytes=Buffer.from(`Bearer ${expected || ''}`), suppliedBytes=Buffer.from(supplied);
  if (!expected || suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) return new NextResponse(null, { status: 401 });
  const admin = memoryAdmin();
  const expired = await admin.rpc('expire_deck_memory_drafts');
  if (expired.error) return NextResponse.json({ error: 'Cleanup could not start.' }, { status: 500 });
  const { data: pending } = await admin.from('deck_memory_cleanup').select('object_key').limit(100);
  let removed = 0;
  for (const item of pending || []) {
    const result = await admin.storage.from('deck-photos').remove([item.object_key]);
    if (!result.error) { await admin.from('deck_memory_cleanup').delete().eq('object_key', item.object_key); removed++; }
  }
  return NextResponse.json({ removed });
}
