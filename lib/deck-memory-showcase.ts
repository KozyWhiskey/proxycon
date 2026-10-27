import { cardKey, isLand, type MemoryCard, type DeckCategory } from './deck-memory';
import { mainCards } from './deck-builder';

/** A showcase is presentation only; it never changes copies or placement. */
export function memoryShowcase(cards: MemoryCard[], categories: DeckCategory[] = []) {
  const illustrated=cards.filter(card=>card.count>0&&card.imageUrl);
  const main=mainCards(illustrated,categories);
  return illustrated.find(card=>card.showcase) || main.find(card=>!isLand(card)) || main[0] || illustrated[0] || null;
}
export function chooseMemoryShowcase(cards: MemoryCard[], key: string | null) {
  if(key!==null&&!cards.some(card=>cardKey(card)===key&&card.imageUrl&&card.count>0)) throw new Error('Choose a card in this deck with available artwork.');
  return cards.map(card=>{
    const rest={...card};delete rest.showcase;
    return key!==null&&cardKey(card)===key?{...rest,showcase:true}:rest;
  });
}
