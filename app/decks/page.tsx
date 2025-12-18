import { createClient } from '@/utils/supabase/server';
import { getCurrentUser } from '@/lib/get-current-user';
import { getUsersDecks } from './actions';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import DeckForm from '@/components/decks/deck-form';
import DeckCard from '@/components/decks/deck-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
      <main className="min-h-screen bg-slate-950 p-4 text-slate-100">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">My Decks</h1>
          <p>Error loading decks: {error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title="My Decks"
        subtitle="Manage your deck library"
        backHref="/"
        backLabel="Home"
        actions={
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
                <Plus className="w-4 h-4 mr-2" />
                New Deck
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800">
              <DialogHeader>
                <DialogTitle>Create New Deck</DialogTitle>
              </DialogHeader>
              <DeckForm />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {decks && decks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {decks.map((deck) => (
              <DeckCard key={deck.id} deck={deck} />
            ))}
          </div>
        ) : (
          <Card className="bg-slate-900 border-slate-800 text-center py-8">
            <CardContent>
              <p className="text-slate-400">No decks found. Create your first one!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}