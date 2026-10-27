import { NextResponse } from 'next/server';
import { ownedMemory } from '@/lib/deck-memory-server';
import { resolveMemoryCard } from '@/lib/deck-memory-catalog';
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ownedMemory((await context.params).id);
    const query = new URL(request.url).searchParams.get('q')?.trim();
    if (!query || query.length > 200) throw new Error('Enter a card name up to 200 characters.');
    return NextResponse.json({ card: await resolveMemoryCard(query) });
  } catch(e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Card search is unavailable. You can enter the name manually.' }, { status: 400 }); }
}
