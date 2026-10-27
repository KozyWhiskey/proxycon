import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadMemory, ownedMemory } from '@/lib/deck-memory-server';
import { deckSaveSchema } from '@/lib/deck-memory-save-schema';

type Context = { params: Promise<{ id: string }> };
function privateJson(value: unknown) { return NextResponse.json(value, { headers: { 'Cache-Control': 'private, no-store' } }); }
function failure(e: unknown) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not update the deck.' }, { status: 400 }); }
export async function GET(_request: Request, context: Context) {
  try { return privateJson(await loadMemory((await context.params).id)); } catch(e) { return failure(e); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const id = (await context.params).id;
    const ctx = await ownedMemory(id);
    const body = await request.json();
    if (body.operation === 'share') {
      const { shared } = z.object({ shared: z.boolean() }).parse(body);
      const { error } = await ctx.supabase.rpc('share_deck_memory', { p_id: id, p_shared: shared });
      if (error) throw new Error(error.message);
    } else {
      const input = deckSaveSchema.parse(body);
      if (!input.categories && ((ctx.memory.categories?.length || 0)>0 || ctx.memory.cards.some(card=>card.allocations?.length))) {
        throw new Error('Reload the updated deck editor before saving categories.');
      }
      const { error } = await ctx.supabase.rpc('save_deck_memory', {
        p_id: id, p_revision: input.revision, p_title: input.title, p_note: input.note, p_cards: input.cards,
        p_decisions: input.decisions, p_confirm: input.confirm, p_incomplete: input.incomplete, p_acknowledged: input.acknowledged,
        p_categories: input.categories || [],
      });
      if (error) throw new Error(error.message);
    }
    return privateJson(await loadMemory(id));
  } catch(e) { return failure(e); }
}
export async function DELETE(_request: Request, context: Context) {
  try {
    const id = (await context.params).id, ctx = await ownedMemory(id);
    const { error } = await ctx.supabase.rpc('delete_deck_memory_item', { p_id: id });
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch(e) { return failure(e); }
}
