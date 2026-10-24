import { requirePlaygroup } from '@/lib/get-current-user';
import { createClient } from '@/utils/supabase/server';
import { PlayerDirectory } from '@/components/players/player-directory';
import { AddPlayerForm } from '@/components/who/add-player-form';
import { ManaDivider } from '@/components/ui/mana-identity';

export default async function PlayersPage() {
  const current = await requirePlaygroup();
  const db = await createClient();
  const [{ data: players, error }, { data: decks, error: deckError }] = await Promise.all([
    db.from('profiles').select('id,display_name,username,avatar_url,color').order('display_name'),
    db.from('decks').select('owner_id'),
  ]);
  if (error || deckError) throw new Error('Could not load the playgroup. Try again.');
  return (
    <main className="page">
      <header className="page-heading">
        <div>
          <ManaDivider />
          <p className="eyebrow">THE PLAYGROUP</p>
          <h1>Players</h1>
        </div>
      </header>
      <PlayerDirectory
        currentId={current.profile?.id ?? null}
        players={(players || []).map((player) => ({
          id: player.id,
          name: player.display_name?.trim() || player.username || 'Player',
          username: player.username,
          avatar: player.avatar_url,
          color: player.color,
          deckCount: (decks || []).filter((deck) => deck.owner_id === player.id).length,
        }))}
      />
      <section className="panel">
        <AddPlayerForm heading="Don't see a name?" />
      </section>
    </main>
  );
}
