import { getCurrentUser } from '@/lib/get-current-user';
import { getUsersDecks } from './actions';
import { redirect } from 'next/navigation';
import DeckCard from '@/components/decks/deck-card';
import CreateDeckDialog from '@/components/decks/create-deck-dialog';
import { PageIntro, FormIdentity } from '@/components/layout/page-intro';
import { Layers, Swords } from 'lucide-react';

export default async function DecksPage() {
  const current = await getCurrentUser();
  if (!current?.profile) redirect('/');
  const { decks, error } = await getUsersDecks();
  return <main className="page collection-page deck-library"><PageIntro eyebrow="THE DECKBOX / YOUR COLLECTION" title={<>Your decks.<br /><em>Your signature.</em></>} description="The commanders you know. The next one you’re brewing. Ready for any table." actions={<CreateDeckDialog />} />
    {error ? <section className="panel"><h2>Could not open your deckbox.</h2><p className="subtle">{error}</p></section> : <>
      <div className="collection-summary"><span><Layers size={16} /><strong>{decks?.length || 0}</strong> saved decks</span><span><Swords size={16} />Ready for the next game</span></div>
      {decks?.length ? <div className="deck-library-grid">{decks.map(deck => <DeckCard key={deck.id} deck={deck} />)}</div> : <div className="deck-empty-layout"><FormIdentity icon="decks" title="Every deck has a story." description="Save a name and your commander. Bring the same deck back next event, or try something new." /><section className="arena-empty"><Layers size={32} /><h2>Open your deckbox.</h2><p>Add your first deck and keep your commanders a tap away when a game starts.</p><CreateDeckDialog /></section></div>}
    </>}
  </main>;
}
