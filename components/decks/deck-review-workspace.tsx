'use client';
/* eslint-disable @next/next/no-img-element */
import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Check, MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cardKey, sameCard, type DeckCategory, type MemoryCard, type MemoryPhoto, type Suggestion } from '@/lib/deck-memory';

import { DeckBuilderBoard } from './deck-builder-board';
import { deckTotals } from '@/lib/deck-builder';

export type ReviewEntry = { suggestion: Suggestion; decision?: 'accepted' | 'dismissed' };
type Props = {
  cards: MemoryCard[]; reviews: ReviewEntry[]; photos: MemoryPhoto[]; owner: boolean; busy: boolean;
  canLookCloser: boolean; manualControls: ReactNode;
  onDecide: (s: Suggestion, accept: boolean, additional?: boolean) => void;
  onBulk: (suggestions: Suggestion[]) => void; onShowPhoto: (id: string) => void;
  onQuantity: (card: MemoryCard, count: number) => void; onRemove: (card: MemoryCard) => void;
  onReplace: (card: MemoryCard, existing: boolean) => void;
  categories: DeckCategory[]; onBuilderChange: (cards:MemoryCard[],categories:DeckCategory[])=>void; onBuilderReplace:(card:MemoryCard,categoryId:string)=>void;
  onLookCloser: (photo: MemoryPhoto, suggestion: Suggestion) => void;
};
function needsReview(s: Suggestion) {
  return s.kind !== 'add' || !s.card.verified || s.alternatives.length > 0 || s.reasons.some(reason => reason !== 'Found by one model');
}
function Artwork({ card }: { card: MemoryCard }) {
  const [failed,setFailed]=useState(false);
  return card.imageUrl && !failed ? <img src={card.imageUrl} alt="" loading="lazy" onError={()=>setFailed(true)} />
    : <span className="review-no-art">{card.name}<small>Artwork unavailable</small></span>;
}

const compactQuery = '(max-width: 1050px)';
function subscribeCompact(listener: () => void) { const query=window.matchMedia(compactQuery); query.addEventListener('change',listener); return () => query.removeEventListener('change',listener); }
function compactSnapshot() { return window.matchMedia(compactQuery).matches; }

export function DeckReviewWorkspace(props: Props) {
  const { cards, reviews, photos, owner, busy, onDecide } = props;
  const [tab, setTab] = useState<'review' | 'deck'>(owner && (reviews.some(r => !r.decision)) ? 'review' : 'deck');
  const [manualOpen,setManualOpen]=useState(!cards.length);
  const [initialOrder] = useState(() => [...reviews].sort((a,b) => Number(!!a.decision)-Number(!!b.decision)).map(r => r.suggestion.id));
  const [filter, setFilter] = useState<'all' | 'pending' | 'attention' | 'reviewed'>('all');
  const [hideReviewed, setHideReviewed] = useState(() => reviews.length > 0 && reviews.every(r => !!r.decision));
  const compact = useSyncExternalStore(subscribeCompact,compactSnapshot,() => false);
  const [viewChoice, setViewChoice] = useState<'auto' | 'stacks' | 'list'>('auto');
  const view = viewChoice === 'auto' ? (compact ? 'list' : 'stacks') : viewChoice;
  const [selection, setSelection] = useState<{ kind: 'review' | 'card'; id: string } | { kind: 'bulk' } | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const open = (next: NonNullable<typeof selection>) => { returnFocus.current = document.activeElement as HTMLElement; setSelection(next); };
  const pending = reviews.filter(r => !r.decision);
  const reviewCollapsed = hideReviewed && reviews.length > 0 && pending.length === 0;
  const additions = pending.map(r => r.suggestion).filter(s => !needsReview(s))
    .filter((s, index, all) => all.findIndex(other => cardKey(other.card) === cardKey(s.card)) === index);
  const visible = reviews.filter(r => filter === 'all' || (filter === 'reviewed' ? !!r.decision : filter === 'pending' ? !r.decision : !r.decision && needsReview(r.suggestion))).sort((a,b) => { const left=initialOrder.indexOf(a.suggestion.id),right=initialOrder.indexOf(b.suggestion.id); return (left<0 ? Number.MAX_SAFE_INTEGER : left)-(right<0 ? Number.MAX_SAFE_INTEGER : right); });
  const total = deckTotals(cards,props.categories).main;
  const selectedReview = selection?.kind === 'review' ? reviews.find(r => r.suggestion.id === selection.id) : null;
  const selectedCard = selection?.kind === 'card' ? cards.find(c => cardKey(c) === selection.id) : selectedReview?.suggestion.card;
  const selectedPhoto = selectedReview ? photos.find(p => p.id === selectedReview.suggestion.photoId) : null;
  const selectDeck = (card: MemoryCard, existing: boolean) => { setSelection(null); setTab('deck'); props.onReplace(card, existing); };

  return <>
    {owner && <div className="review-phone-tabs" role="tablist" aria-label="Deck workspace" onKeyDown={event => { if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return; event.preventDefault(); const next=event.key==='Home' ? 'review' : event.key==='End' ? 'deck' : tab==='review' ? 'deck' : 'review'; setTab(next); document.getElementById(next==='review' ? 'review-tab' : 'deck-tab')?.focus(); }}>
      <button role="tab" tabIndex={tab === 'review' ? 0 : -1} id="review-tab" aria-selected={tab === 'review'} aria-controls="review-panel" onClick={() => setTab('review')}>Review · {pending.length}</button>
      <button role="tab" tabIndex={tab === 'deck' ? 0 : -1} id="deck-tab" aria-selected={tab === 'deck'} aria-controls="memory-decklist" onClick={() => setTab('deck')}>Your deck · {total}</button>
    </div>}
    <div className={`review-workspace-columns${owner ? '' : ' is-reader'}${reviewCollapsed ? ' is-complete' : ''}`}>
      {owner && <section id="review-panel" className={`review-candidates${tab === 'review' ? ' is-phone-active' : ''}`} aria-label="Suggested changes">
        {reviewCollapsed ? <div className="review-completion"><span><Check size={18} aria-hidden="true" />Photo review complete · {reviews.length} reviewed</span><Button variant="outline" onClick={() => setHideReviewed(false)}>Show reviewed cards</Button></div> : <>
        <header className="review-section-heading"><h2>Review photo cards</h2><span>{pending.length} remaining</span></header>
        {reviews.length > 0 && !pending.length && <Button variant="ghost" onClick={() => setHideReviewed(true)}>Hide reviewed cards</Button>}
        <div className="review-filterbar"><div className="review-filters" aria-label="Filter photo cards">
          {(['all','pending','attention','reviewed'] as const).map(value => <Button key={value} variant="ghost" aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === 'all' ? 'All' : value === 'pending' ? 'Pending' : value === 'attention' ? 'Needs review' : 'Reviewed'}</Button>)}
        </div>{additions.length > 1 && <Button variant="outline" aria-label="Add listed cards" disabled={busy} onClick={() => open({kind:'bulk'})}>Add listed</Button>}</div>
        <p className="sr-only">Add cards you recognize. Open a card for details and photo evidence.</p>
        {!visible.length && <p className="text-sm text-muted-foreground">{filter !== 'all' ? 'No cards in this filter.' : reviews.length ? 'No changes suggested.' : 'Read a photo to suggest cards, or enter names in Your deck.'}</p>}
        <div className="review-candidate-grid">{visible.map(({suggestion:s,decision}) => { const inDeck=cards.some(c => sameCard(c,s.card)); return <article key={s.id} className={`review-candidate${decision ? ' is-reviewed' : ''}`} data-review-id={s.id}>
          <button className="review-card-open" aria-label={`View ${s.card.name}`} onClick={() => open({kind:'review',id:s.id})}>
            <span className="review-candidate-art"><Artwork card={s.card} />{s.observedCount > 1 && <span className="review-copy-tag">×{s.observedCount}</span>}</span><span className="sr-only">{s.card.name}</span>
          </button>
          <div className="review-candidate-footer">
            {decision ? <Button variant="ghost" className={decision === 'accepted' && inDeck ? 'review-added' : 'review-skipped'} aria-label={s.card.name + (decision === 'accepted' && inDeck ? ' added. View details.' : ' reviewed. View details.')} onClick={() => open({kind:'review',id:s.id})}>{decision === 'accepted' && inDeck && <Check size={16} aria-hidden="true" />}{decision === 'accepted' ? (inDeck ? 'Added' : 'Reviewed') : 'Skipped'}</Button>
              : needsReview(s) ? <Button variant="outline" className="review-attention" disabled={busy} onClick={() => open({kind:'review',id:s.id})}>Review<span className="sr-only"> {s.card.name}</span></Button>
              : <Button disabled={busy} aria-label={`Add ${s.observedCount} ${s.card.name} to your deck`} onClick={() => onDecide(s,true)}><Plus size={17} aria-hidden="true" />Add{s.observedCount > 1 ? ` ${s.observedCount}` : ''}</Button>}
            <Button variant="ghost" size="icon" aria-label={`More options for ${s.card.name}`} onClick={() => open({kind:'review',id:s.id})}><MoreHorizontal size={20} aria-hidden="true" /></Button>
          </div>
          {!decision && needsReview(s) && <span className="review-attention-label">{s.reasons.includes('Check name') || s.alternatives.length ? 'Check name' : s.kind === 'overlap' ? 'Already in deck' : 'Check quantity'}</span>}
        </article>; })}</div>
        </>}
      </section>}
      <section id="memory-decklist" className={`review-deck${tab === 'deck' ? ' is-phone-active' : ''}`} aria-label="Your decklist">
        <header className="review-section-heading"><h2>Your deck · {total} cards</h2><label className="text-sm"><span className="sr-only">Deck view</span><select aria-label="Deck view" value={view} onChange={e => setViewChoice(e.target.value as 'stacks' | 'list')}><option value="stacks">Stacks</option><option value="list">List</option></select></label></header>
        {!cards.length && <p className="review-section-hint">Your list is empty. Add cards from the photo or by name.</p>}
        {owner && <details className="review-manual-controls" open={manualOpen} onToggle={event=>setManualOpen(event.currentTarget.open)}><summary>Add cards & basic lands</summary>{props.manualControls}</details>}
        {cards.length>0&&<DeckBuilderBoard cards={cards} categories={props.categories} owner={owner} busy={busy} view={view} onChange={props.onBuilderChange} onReplace={props.onBuilderReplace} />}
      </section>
    </div>

    <Dialog open={!!selection} onOpenChange={value => { if (!value) setSelection(null); }}>
      <DialogContent className="review-inspector" onCloseAutoFocus={event => { event.preventDefault(); if (returnFocus.current?.isConnected) returnFocus.current.focus(); document.getElementById('review-tab')?.focus(); }}>
        <DialogTitle>{selection?.kind === 'bulk' ? 'Add listed cards' : selectedCard?.name || 'Card details'}</DialogTitle>
        <DialogDescription>{selection?.kind === 'bulk' ? 'Review these new entries and their visible copy counts before adding.' : selectedReview ? 'Review the photo reading before changing your deck.' : 'Card details and deck quantity.'}</DialogDescription>
        {selection?.kind === 'bulk' ? <>
          <ul className="review-bulk-list">{additions.map(s => <li key={s.id}><span>{s.card.name}</span><strong>×{s.observedCount}</strong></li>)}</ul>
          <p className="text-sm text-muted-foreground">Only new, matched names without quantity conflicts are included. Provider agreement does not verify accuracy.</p>
          <Button disabled={busy || !additions.length} onClick={() => { props.onBulk(additions); setSelection(null); }}>Add {additions.length} entries · {additions.reduce((sum,s) => sum+s.observedCount,0)} copies</Button>
        </> : selectedCard && <>
          <div className="review-inspector-art"><Artwork card={selectedCard} /></div>
          {selectedReview ? <>
            <p>Photo shows {selectedReview.suggestion.observedCount}{selectedReview.suggestion.currentCount ? ` · Current ${selectedReview.suggestion.currentCount}` : ''}{selectedReview.suggestion.agreed ? ' · Models agree' : ''}</p>
            {selectedReview.suggestion.reasons.length > 0 && <p className="text-sm text-muted-foreground">{selectedReview.suggestion.reasons.join(' · ')}</p>}
            {!!selectedReview.suggestion.alternatives.length && <p>Other reading: {selectedReview.suggestion.alternatives.join(', ')}. Choose one name for this card.</p>}
            {selectedReview.decision ? <p className="review-added">{selectedReview.decision === 'accepted' ? (cards.some(c => sameCard(c,selectedCard)) ? 'Added to your deck.' : 'Reviewed. This card is no longer in your deck.') : 'Skipped.'} </p> : <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => onDecide(selectedReview.suggestion,true)}>{selectedReview.suggestion.kind === 'add' ? `Add ${selectedReview.suggestion.observedCount}` : `Use ${selectedReview.suggestion.observedCount} visible copies`}</Button>
              {selectedReview.suggestion.kind === 'overlap' && <Button variant="outline" disabled={busy} onClick={() => onDecide(selectedReview.suggestion,true,true)}>These are {selectedReview.suggestion.observedCount} additional copies</Button>}
              <Button variant="outline" disabled={busy} onClick={() => onDecide(selectedReview.suggestion,false)}>{selectedReview.suggestion.currentCount ? 'Keep current' : 'Skip card'}</Button>
              <Button variant="ghost" onClick={() => selectDeck(selectedCard,false)}>Find another card</Button>
            </div>}
            <details className="disclosure"><summary>View photo evidence</summary><div>
              {selectedPhoto?.url && <div className="relative overflow-hidden rounded-md"><img src={selectedPhoto.url} alt={`Source photo for ${selectedCard.name}`} className="w-full" /><span className="absolute border-2 border-primary" aria-hidden="true" style={{left:`${selectedReview.suggestion.region.x*100}%`,top:`${selectedReview.suggestion.region.y*100}%`,width:`${selectedReview.suggestion.region.width*100}%`,height:`${selectedReview.suggestion.region.height*100}%`}} /></div>}
              <Button className="mt-3" variant="outline" disabled={busy || !props.canLookCloser || !selectedPhoto} onClick={() => { if (selectedPhoto) props.onLookCloser(selectedPhoto,selectedReview.suggestion); setSelection(null); }}>Look closer with selected reader</Button>
              {!props.canLookCloser && <p className="text-sm">Choose and allow a reader in Photos & recognition first.</p>}
              <p className="text-xs text-muted-foreground">A closer look is a separate paid recheck, not independent confirmation.</p>
            </div></details>
          </> : <>
            <p className="text-sm text-muted-foreground">{selectedCard.typeLine || 'Unverified card type'}{selectedCard.edited ? ' · Reviewed or edited' : ''}</p>
            {owner && <><div className="review-inspector-quantity"><Button variant="outline" size="icon" aria-label={`Remove one ${selectedCard.name}`} disabled={busy || selectedCard.count <= 1} onClick={() => props.onQuantity(selectedCard,selectedCard.count-1)}>−</Button><span>{selectedCard.count}</span><Button variant="outline" size="icon" aria-label={`Add one ${selectedCard.name}`} disabled={busy || selectedCard.count >= 250} onClick={() => props.onQuantity(selectedCard,selectedCard.count+1)}>+</Button></div>
              <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => selectDeck(selectedCard,true)}>Replace</Button><Button variant="ghost" disabled={busy} onClick={() => { props.onRemove(selectedCard); setSelection(null); }}>Remove from deck</Button></div></>}
            {selectedCard.sources.filter(id => photos.some(p => p.id === id)).map(id => <a key={id} href={`#photo-${id}`} onClick={() => { setSelection(null); props.onShowPhoto(id); }} className="text-link underline">Source photo {photos.findIndex(p => p.id === id)+1}</a>)}
          </>}
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
