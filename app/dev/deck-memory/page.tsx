import { notFound } from 'next/navigation';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DeckMemoryEditor } from '@/components/decks/deck-memory-editor';
import { deckMemoryPreview } from '@/scripts/fixtures/deck-memory-preview';
import { manualCard, cardKey, type MemoryCard } from '@/lib/deck-memory';
import { automaticCategory, moveCopies } from '@/lib/deck-builder';
import { PageIntro } from '@/components/layout/page-intro';
import {LimitedMemoryCard} from '@/components/decks/limited-memory-card';

/** Development-only fixture for visual and interaction QA. Never uses player data. */
export default async function DeckMemoryPreviewPage({ searchParams }: { searchParams: Promise<{ failed?: string; layout?: string }> }) {
  if (process.env.NODE_ENV !== 'development' || process.env.DECK_MEMORY_PREVIEW !== 'true') notFound();
  const bytes = await readFile(join(process.cwd(),'scripts/fixtures/deck-memories/draft-duplicates.webp'));
  const payload = deckMemoryPreview(`data:image/webp;base64,${bytes.toString('base64')}`);
  const options = await searchParams;
  if(options.layout==='library') return <main className="page collection-page deck-library"><PageIntro title="Your decks." description="Limited deck showcase preview"/><section className="space-y-4"><h2 className="font-heading text-2xl">Limited decks</h2><ul className="deck-library-grid">{[
    {id:'preview-one',title:'First Test Deck',showcaseName:'Night Market',artUrl:'https://cards.scryfall.io/art_crop/front/a/8/a8c1dce3-6136-4294-9d2b-5ef8527d733b.jpg?1783907841'},
    {id:'preview-two',title:'Sunday draft · A deck worth remembering',showcaseName:'Night Market',artUrl:'https://cards.scryfall.io/art_crop/front/a/8/a8c1dce3-6136-4294-9d2b-5ef8527d733b.jpg?1783907841'},
    {id:'preview-empty',title:'New Limited deck',showcaseName:null,artUrl:null},
  ].map((sample,index)=><li key={sample.id}><LimitedMemoryCard {...sample} main={index===2?0:40} sideboard={index===2?0:8} status={index===1?'confirmed':'pending'} shared={index===1} created_at="2026-10-26T18:00:00Z" is_current/></li>)}</ul></section></main>;
  if ((options.layout === 'full' || options.layout === 'complete' || options.layout === 'sparse' || options.layout === 'organized' || options.layout === 'stress')) {
    const catalog = JSON.parse(await readFile(join(process.cwd(),'scripts/fixtures/deck-memories/gallery.json'),'utf8')) as Partial<MemoryCard>[];
    const gallery = catalog.map(c => ({...manualCard(c.name!,c.count),...c})) as MemoryCard[];
    const basics = payload.memory.cards.filter(c => c.name === 'Swamp' || c.name === 'Mountain').map(c => ({...c,count:8}));
    payload.memory.cards = options.layout === 'sparse' ? basics.map(c => ({...c,count:1})) : [...((options.layout === 'complete'||options.layout==='organized'||options.layout==='stress') ? gallery : gallery.slice(0,7)),...basics];
    const observed = [...gallery,...basics.map(c => ({...c,count:1}))];
    payload.attempts = payload.attempts.map(a => ({...a,purpose:'initial',observations:observed.map((card,index) => ({title:card.name,name:card.name,count:card.count,card,region:{x:(index%6)/6,y:Math.floor(index/6)/4,width:0.15,height:0.2},uncertainName:!card.verified,uncertainCount:false}))}));
    payload.memory.decisions = Object.fromEntries(payload.memory.cards.map(c => [payload.attempts[0].analysis_key+':'+cardKey(c),'accepted' as const]));
  }
  if(options.layout==='organized'){const removal={id:'90000000-0000-4000-8000-000000000001',name:'Removal',zone:'main' as const,order:0};payload.memory.categories=[removal];payload.memory.cards=payload.memory.cards.map(card=>card.name==='Gas Guzzler'?moveCopies({...card,count:3},automaticCategory(card),'sideboard',1):card.name==='Burnout Bashtronaut'?moveCopies(card,automaticCategory(card),removal.id,1):card);}
  if(options.layout==='stress'){const reserve={id:'90000000-0000-4000-8000-000000000002',name:'Cards to consider after the first round',zone:'sideboard' as const,order:1};payload.memory.categories=[reserve];payload.memory.cards=payload.memory.cards.map(card=>card.name==='Swamp'?moveCopies({...card,count:48},automaticCategory(card),'sideboard',19):card.name==='Burnout Bashtronaut'?moveCopies(card,automaticCategory(card),reserve.id,1):card);}
  if (options.failed === 'google') payload.attempts = payload.attempts.map(attempt => attempt.provider === 'google' ? {...attempt,status:'failed',error_category:'reader_unavailable'} : attempt);
  return <main className="page collection-page deck-memory-page task-page"><PageIntro compact eyebrow="Development preview · Sunday draft" title="Review your deck" /><DeckMemoryEditor initial={payload} /></main>;
}
