import { NextResponse } from 'next/server';
import { z } from 'zod';
import { memoryContext } from '@/lib/deck-memory-server';

export async function POST(request: Request) {
  try {
    const { tournamentId } = z.object({ tournamentId: z.string().uuid() }).parse(await request.json());
    const ctx = await memoryContext();
    const { data, error } = await ctx.supabase.rpc('resume_deck_memory', { p_tournament: tournamentId });
    if (error) throw new Error(error.message);
    return NextResponse.json({ id: data });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not start a deck memory.' }, { status: 400 }); }
}
