import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requirePlaygroup } from '@/lib/get-current-user';
import { createClient } from '@/utils/supabase/server';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { COLOR_DISPLAY_NAMES } from '@/lib/player-colors';
import DeckCard from '@/components/decks/deck-card';
import { type Deck } from '@/lib/types';
import { ManaIdentity, ManaDivider } from '@/components/ui/mana-identity';
import { ArrowUpRight, CalendarDays } from 'lucide-react';

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const current = await requirePlaygroup();
  const meId = current.profile?.id;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const db = await createClient();
  const [{ data: player, error }, { data: decks, error: deckError }] = await Promise.all([
    db.from('profiles').select('id,display_name,username,avatar_url,color,bio').eq('id', id).maybeSingle(),
    db.from('decks').select('*').eq('owner_id', id).order('name'),
  ]);
  if (error || deckError) throw new Error('Could not load this player. Try again.');
  if (!player) notFound();
  const name = player.display_name?.trim() || player.username || 'Player';
  return (
    <main className="page collection-page player-profile">
      <Link href="/players" className="subtle">
        ← All players
      </Link>
      <header className="page-heading player-profile-banner">
        <div className="flex items-center gap-5">
          <Avatar className="h-20 w-20">
            <AvatarImage src={player.avatar_url || undefined} alt="" />
            <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <ManaDivider />
            <p className="eyebrow">PLAYGROUP</p>
            <h1>{name}</h1>
            {player.username && <p className="subtle">@{player.username.replace(/^@/, '').trim()}</p>}
          </div>
        </div>
        {id === meId && (
          <Button asChild variant="outline">
            <Link href="/profile">Edit my profile</Link>
          </Button>
        )}
      </header>
      {(player.bio || player.color) && (
        <section className="panel space-y-4">
          {player.bio && <p className="text-sm whitespace-pre-wrap leading-relaxed">{player.bio}</p>}
          {player.color && (
            <p className="subtle flex items-center gap-2">
              <ManaIdentity color={player.color} />
              {COLOR_DISPLAY_NAMES[player.color] || player.color}
            </p>
          )}
        </section>
      )}
      <section>
        <div className="section-heading">
          <h2>Decks</h2>
          <span className="subtle">{decks?.length || 0}</span>
        </div>
        <div className="deck-library-grid">
          {(decks || []).map((deck) => (
            <DeckCard key={deck.id} deck={deck as Deck} isOwner={id === meId} />
          ))}
        </div>
        {!decks?.length && (
          <div className="empty-state">
            <h3>No decks yet</h3>
            <p>
              {id === meId
                ? 'Add a deck to keep your commanders ready for the next game.'
                : 'This player hasn’t added any decks yet.'}
            </p>
            {id === meId && (
              <Button asChild variant="outline">
                <Link href="/decks">Add a deck</Link>
              </Button>
            )}
          </div>
        )}
      </section>
      <Link className="utility-link" href="/">
        <CalendarDays size={23} />
        <span>
          <strong>Events</strong>
          <small>Weekend games, results, and stats.</small>
        </span>
        <ArrowUpRight size={18} />
      </Link>
    </main>
  );
}
