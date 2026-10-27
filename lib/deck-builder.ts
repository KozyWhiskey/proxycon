import { sameCard, deckCardGroup, DECK_CARD_GROUPS, isLand, type DeckCategory, type MemoryCard } from './deck-memory';

export const TYPE_CATEGORIES: DeckCategory[] = DECK_CARD_GROUPS.map((name,order) => ({id:'type-'+name.toLowerCase(),name,zone:'main',order}));
export const SIDEBOARD: DeckCategory = {id:'sideboard',name:'Sideboard',zone:'sideboard',order:0};
export function deckCategories(overrides: DeckCategory[] = []) {
  const merged = [...TYPE_CATEGORIES,SIDEBOARD].map(c => ({...c,...overrides.find(o => o.id===c.id)}));
  return [...merged,...overrides.filter(c => !merged.some(m => m.id===c.id))].sort((a,b) => a.zone.localeCompare(b.zone)||a.order-b.order||a.name.localeCompare(b.name));
}
export function automaticCategory(card: MemoryCard) { return 'type-'+deckCardGroup(card).toLowerCase(); }
export function allocationCount(card: MemoryCard, categoryId: string) {
  const explicit=(card.allocations||[]).find(a => a.categoryId===categoryId)?.count||0;
  return explicit+(categoryId===automaticCategory(card) ? card.count-(card.allocations||[]).reduce((s,a)=>s+a.count,0) : 0);
}
export function sideboardCount(card: MemoryCard,categories: DeckCategory[] = []) {
  const sides=new Set(deckCategories(categories).filter(c=>c.zone==='sideboard').map(c=>c.id));
  return (card.allocations||[]).filter(a=>sides.has(a.categoryId)).reduce((s,a)=>s+a.count,0);
}
export function mainCards(cards: MemoryCard[],categories: DeckCategory[] = []) { return cards.map(c=>({...c,count:c.count-sideboardCount(c,categories)})).filter(c=>c.count>0); }
export function deckTotals(cards: MemoryCard[],categories: DeckCategory[] = []) {
  const main=mainCards(cards,categories),total=main.reduce((s,c)=>s+c.count,0),lands=main.filter(isLand).reduce((s,c)=>s+c.count,0);
  return {main:total,lands,nonlands:total-lands,sideboard:cards.reduce((s,c)=>s+sideboardCount(c,categories),0)};
}
/** An implicit automatic destination is always encoded as remainder, never duplicated. */
export function setAllocationCount(card: MemoryCard,categoryId: string,count: number): MemoryCard {
  if (!Number.isInteger(count)||count<0||count>250) throw new Error('Choose a whole copy count from 0 to 250.');
  const previous=allocationCount(card,categoryId),total=card.count+count-previous;
  if(total<0||total>250) throw new Error('A card may have at most 250 recorded copies.');
  const allocations=(card.allocations||[]).filter(a=>a.categoryId!==categoryId);
  if (categoryId!==automaticCategory(card)&&count) allocations.push({categoryId,count});
  return {...card,count:total,allocations,edited:true};
}
export function moveCopies(card: MemoryCard,from: string,to: string,count: number): MemoryCard {
  if (from===to) throw new Error('Choose a different destination.');
  if (!Number.isInteger(count)||count<1||count>allocationCount(card,from)) throw new Error('Choose copies available in this category.');
  const next=setAllocationCount(card,from,allocationCount(card,from)-count);
  return setAllocationCount(next,to,allocationCount(next,to)+count);
}
export function deleteCategory(cards: MemoryCard[],category: DeckCategory) {
  return cards.map(card => {
    const count=allocationCount(card,category.id);
    if (!count) return card;
    const next=moveCopies(card,category.id,category.zone==='sideboard'?'sideboard':automaticCategory(card),count);
    return {...next,edited:true};
  });
}
export function categoryNameError(name: string,zone: DeckCategory['zone'],categories: DeckCategory[],id?:string) {
  if (!name.trim()||name.trim().length>48) return 'Use a category name from 1 to 48 characters.';
  if (deckCategories(categories).some(c=>c.id!==id&&c.zone===zone&&c.name.toLocaleLowerCase()===name.trim().toLocaleLowerCase())) return 'A category with this name already exists in this section.';
  return '';
}
export function builderText(cards: MemoryCard[],categories: DeckCategory[] = [],onlyMain=false) {
  const main=mainCards(cards,categories).map(c=>`${c.count} ${c.name}`).join('\n');
  const side=cards.map(c=>({...c,count:sideboardCount(c,categories)})).filter(c=>c.count).map(c=>`${c.count} ${c.name}`).join('\n');
  return main+(!onlyMain&&side?'\n\nSideboard\n'+side:'');
}
export function replaceAllocation(cards: MemoryCard[],source: MemoryCard,categoryId:string,replacement:MemoryCard) {
  const count=allocationCount(source,categoryId),remaining=setAllocationCount(source,categoryId,0);
  const rows=cards.filter(c=>!sameCard(c,source));
  if (remaining.count) rows.push(remaining);
  const existing=rows.find(c=>sameCard(c,replacement));
  let next=existing?{...replacement,...existing,oracleId:existing.oracleId||replacement.oracleId,printingId:existing.printingId||replacement.printingId,imageUrl:existing.imageUrl||replacement.imageUrl,typeLine:existing.typeLine||replacement.typeLine,verified:existing.verified||replacement.verified,sources:[...new Set([...existing.sources,...replacement.sources])]}:{...replacement,count:0,allocations:[]};
  // An old implicit type destination follows the replacement's own automatic type.
  const destination=categoryId===automaticCategory(source)?automaticCategory(next):categoryId;
  next=setAllocationCount(next,destination,allocationCount(next,destination)+count);
  return [...rows.filter(c=>!sameCard(c,next)),next];
}
