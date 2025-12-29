import { createClient } from '@/utils/supabase/server';
import { getCurrentUser } from '@/lib/get-current-user';
import { getUsersDecks } from './actions';
import { redirect } from 'next/navigation';
import DeckCard from '@/components/decks/deck-card';
import CreateDeckDialog from '@/components/decks/create-deck-dialog';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';

export default async function DecksPage() {
  const supabase = await createClient();
  const authData = await getCurrentUser();

  if (!authData || !authData.user) {
    redirect('/login');
  }

  // Fetch only the profile for the UserHeader, not the linkedPlayer from V1
  // This page assumes V2 profile is available.
  const profile = authData.profile;

  const { decks, error } = await getUsersDecks();

  if (error) {
    return (
      <main className="min-h-screen p-4 text-foreground bg-background">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-4 font-heading">My Decks</h1>
          <p>Error loading decks: {error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24 bg-background">
      <PageHeader
        title="My Decks"
        subtitle="Manage your deck library"
        backHref="/"
        backLabel="Home"
        actions={<CreateDeckDialog />}
      />

      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {decks && decks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {decks.map((deck) => (
              <DeckCard key={deck.id} deck={deck} />
            ))}
          </div>
        ) : (
          <Card className="text-center py-8 glass-panel">
            <CardContent>
              <p className="text-muted-foreground italic">No decks found. Create your first one!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
