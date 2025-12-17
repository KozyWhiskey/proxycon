import { createClient } from '@/utils/supabase/server';
import { getCurrentUser } from '@/lib/get-current-user';
import { getUsersDecks } from './actions';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Swords, Trash2, Edit2 } from 'lucide-react';
import Link from 'next/link';
import DeckForm from '@/components/decks/deck-form'; // Fixed Import Path
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import PageHeader from '@/components/ui/page-header';

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
              <Card key={deck.id} className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-xl text-slate-100 flex items-center gap-2">
                    <Swords className="w-5 h-5 text-yellow-500" />
                    {deck.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-between items-center">
                  <div>
                    <p className="text-slate-400 text-sm">{deck.format} {deck.commander_name ? `(${deck.commander_name})` : ''}</p>
                    {deck.colors && deck.colors.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {deck.colors.map((color: string) => (
                          <span key={color} className={`w-4 h-4 rounded-full ${color === 'W' ? 'bg-white' : color === 'U' ? 'bg-blue-500' : color === 'B' ? 'bg-black' : color === 'R' ? 'bg-red-500' : 'bg-green-500'} border border-slate-700`} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {/* In a real app, these would open edit/delete dialogs */}
                    <Button variant="outline" size="icon" className="h-8 w-8 text-slate-400 hover:text-white border-slate-700">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="destructive" size="icon" className="h-8 w-8">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
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