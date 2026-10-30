import { NextRequest, NextResponse } from 'next/server';
import { resolvePlayer } from '@/lib/player-session';
import { z } from 'zod';

/** Availability only. The rendered page separately acknowledges its successful snapshot. */
export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    const ctx = await resolvePlayer();
    if (!ctx.authUser) return NextResponse.json({ error: 'Choose your name first.' }, { status: 401, headers });
    let id = request.nextUrl.searchParams.get('event');
    const tournament = request.nextUrl.searchParams.get('tournament');
    if ((id && !z.uuid().safeParse(id).success) || (tournament && !z.uuid().safeParse(tournament).success)) return NextResponse.json({ error: 'Unavailable.' }, { status: 400, headers });
    if (tournament) {
      const { data, error } = await ctx.supabase.from('tournaments').select('event_id').eq('id', tournament).maybeSingle();
      if (error) throw error;
      id = data?.event_id || null;
      if (!id) return NextResponse.json({ error: 'Tournament unavailable.' }, { status: 404, headers });
    }
    let query = ctx.supabase.from('events').select('id').limit(1);
    if (id) query = query.eq('id', id);
    const { data, error } = await query;
    if (error) throw error;
    if (id && !data?.length) return NextResponse.json({ error: 'Event unavailable.' }, { status: 404, headers });
    return NextResponse.json({ available: true }, { headers });
  } catch {
    return NextResponse.json({ error: 'Could not refresh.' }, { status: 503, headers });
  }
}
