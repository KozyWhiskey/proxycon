import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import ts from 'typescript';
const nativeRequire=createRequire(import.meta.url);
async function compile(path,dependencies={}) {
 const source=await readFile(path,'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const compiledModule={exports:{}};
 new Function('require','module','exports',js)(id=>dependencies[id]||nativeRequire(id),compiledModule,compiledModule.exports);
 return compiledModule.exports;
}
const core=await compile('lib/deck-memory.ts');
const cache=new Map();const backoffs=[];let lease=0;
const admin={rpc:async()=>({data:new Date(Date.now()+lease).toISOString()}),from:table=>({
 select:()=>({eq:(_column,key)=>({maybeSingle:async()=>({data:cache.get(key)||null})})}),
 upsert:async value=>{for(const row of Array.isArray(value)?value:[value]) cache.set(row.lookup_key,row);return {};},
 update:value=>({eq:async()=>{backoffs.push({table,value});return {};}}),
})};
const {resolveMemoryCard,tournamentCardPool,memoryShowcaseArtwork}=await compile('lib/deck-memory-catalog.ts',{'server-only':{},'./deck-memory':core,'./deck-memory-admin':{memoryAdmin:()=>admin}});
const originalFetch=globalThis.fetch;const requests=[];let responses=[];
globalThis.fetch=async(url,options)=>{
 requests.push({url,options});
 const next=responses.shift();assert.ok(next,'Unexpected extra catalog request');
 return new Response(JSON.stringify(next.body||{}),{status:next.status||200});
};
const canonical={id:'11111111-1111-4111-8111-111111111111',oracle_id:'22222222-2222-4222-8222-222222222222',name:'Pactdoll Terror',type_line:'Artifact Creature — Toy'};
try {
 responses=[{body:canonical}];
 let card=await resolveMemoryCard('Pactdoll Terror',2);
 assert.equal(card.verified,true);assert.equal(card.count,2);
 const count=requests.length;
 await resolveMemoryCard('Pactdoll Terror',3);assert.equal(requests.length,count,'Cached identity must avoid redundant requests');
 responses=[{status:404},{body:canonical}];
 card=await resolveMemoryCard('Pactdoll Trrr');assert.equal(card.name,'Pactdoll Terror');assert.equal(card.verified,false,'Fuzzy correction requires review');
 responses=[{body:{...canonical,name:'Front Face // Back Face',card_faces:[{name:'Front Face',image_uris:{normal:'https://cards.scryfall.io/front.jpg'}},{name:'Back Face'}]}}];
 card=await resolveMemoryCard('Back Face');assert.equal(card.oracleId,canonical.oracle_id);assert.equal(card.imageUrl,'https://cards.scryfall.io/front.jpg');
 responses=[{status:404},{status:404}];
 card=await resolveMemoryCard('A custom cube card');assert.equal(card.verified,false);assert.equal(card.name,'A custom cube card');
 responses=[{body:{data:[canonical],has_more:true,next_page:'https://api.scryfall.com/cards/search?page=2'}},{body:{data:[{...canonical,name:'Another Card',oracle_id:'33333333-3333-4333-8333-333333333333'}],has_more:false}}];
 const pool=await tournamentCardPool(['DFT']);assert.equal(pool.complete,true);assert.equal(pool.names.length,2);
 const poolRequests=requests.length;
 assert.deepEqual(await tournamentCardPool(['dft']),pool);assert.equal(requests.length,poolRequests);
 responses=[{body:{...canonical,image_uris:{art_crop:'https://cards.scryfall.io/art_crop/front/test.jpg'}}}];
 const artCard={...core.manualCard('Pactdoll Terror'),printingId:canonical.id,imageUrl:'https://cards.scryfall.io/normal/front/test.jpg'};
 assert.equal(await memoryShowcaseArtwork(artCard),'https://cards.scryfall.io/art_crop/front/test.jpg');
 const artRequests=requests.length;
 assert.equal(await memoryShowcaseArtwork(artCard),'https://cards.scryfall.io/art_crop/front/test.jpg');
 assert.equal(requests.length,artRequests,'Cached artwork avoids repeated card API calls');
 responses=[{status:429}];await assert.rejects(()=>resolveMemoryCard('Throttle test'),/busy/);
 assert.ok(backoffs.some(b=>Date.parse(b.value.next_at)>Date.now()+20_000));
 lease=9000;
 await assert.rejects(()=>resolveMemoryCard('Busy test'),/busy/);assert.equal(responses.length,0);
 assert.ok(requests.every(r=>r.options.headers['User-Agent']&&r.options.headers.Accept));
 console.log('Catalog tests passed: exact and fuzzy names, face identity, custom cards, set-pool pagination/cache, rate-limit backoff, and upstream headers.');
}finally{globalThis.fetch=originalFetch;}
