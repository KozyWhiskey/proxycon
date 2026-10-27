import type { MemoryPayload } from '@/components/decks/deck-memory-editor';
import { manualCard } from '@/lib/deck-memory';
export function deckMemoryPreview(photoUrl: string): MemoryPayload {
  const id='10000000-0000-4000-8000-000000000001';
  const photo='20000000-0000-4000-8000-000000000001';
  const group='30000000-0000-4000-8000-000000000001';
  const artwork='https://cards.scryfall.io/normal/front/7/0/70226354-47b7-4f9d-a5a8-559d17f07720.jpg?1783907891';
  const observed = { ...manualCard('Pactdoll Terror',2),imageUrl:artwork,typeLine:'Artifact Creature — Toy',verified:true,edited:false };
  const art: Record<string,string> = {"Mountain":"https://cards.scryfall.io/normal/front/8/5/85177bd7-6c50-48da-b692-ae5fe7bd357c.jpg?1791578439","Swamp":"https://cards.scryfall.io/normal/front/b/2/b233b117-9369-45c1-80c5-cc857386b6be.jpg?1791578437","Gas Guzzler":"https://cards.scryfall.io/normal/front/4/d/4db3a28c-e4b4-4b18-8d56-e3842184d105.jpg?1783907896","Gastal Thrillseeker":"https://cards.scryfall.io/normal/front/a/8/a8e5205d-d734-4292-a3c8-70cf5f131289.jpg?1783907857"};
  const payload: MemoryPayload = {
    owner:true, photoProcessing:true,
    memory:{id,tournament_id:'40000000-0000-4000-8000-000000000001',event_id:'50000000-0000-4000-8000-000000000001',profile_id:'60000000-0000-4000-8000-000000000001',
      title:'Rakdos at the finish line',note:'Aetherdrift draft',status:'pending',incomplete:false,shared:false,revision:0,created_at:'2026-10-25T16:00:00Z',updated_at:'2026-10-25T16:00:00Z',decisions:{},
      cards:[{...manualCard('Swamp',9),typeLine:'Basic Land — Swamp',verified:true},{...manualCard('Mountain',8),typeLine:'Basic Land — Mountain',verified:true},
        {...manualCard('Pactdoll Terror'),imageUrl:artwork,typeLine:'Artifact Creature — Toy',verified:true},{...manualCard('Gastal Thrillseeker',2),typeLine:'Creature — Lizard Berserker',verified:true}]},
    photos:[{id:photo,purpose:'check',status:'ready',url:photoUrl,width:2433,height:1320}],
    tournament:{name:'Sunday Aetherdrift draft',status:'completed'},
    readers:{google:{name:'Google Gemini',model:'gemini-3.8-flash',available:true},openai:{name:'OpenAI',model:'gpt-6.1-sol',available:true}},
    attempts:(['google','openai'] as const).map((provider,index)=>({id:`70000000-0000-4000-8000-00000000000${index+1}`,photo_id:photo,provider,model:provider,status:'ready',
      observations:[{title:'Pactdoll Terror',name:'Pactdoll Terror',count:2,region:{x:0.6,y:0.03,width:0.13,height:0.36},uncertainName:false,uncertainCount:false,card:observed}],
      error_category:null,created_at:'2026-10-25T16:01:00Z',analysis_key:group,selection:'both',purpose:'check',baseline_revision:0,region:null})),
  };
  payload.memory.cards = payload.memory.cards.map(card => ({...card,imageUrl:art[card.name] || card.imageUrl}));
  for (const attempt of payload.attempts) attempt.observations.push(...['Gas Guzzler'].map(name=>({title:name,name,count:1,region:{x:0.2,y:0.03,width:0.13,height:0.3},uncertainName:false,uncertainCount:false,card:{...manualCard(name),typeLine:'Creature — Vampire Rogue',verified:true,imageUrl:art[name] || null}})));
  return payload;
}
