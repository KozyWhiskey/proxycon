import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import ts from 'typescript';
const native=createRequire(import.meta.url);
async function compile(path,modules={}) {const js=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const mod={exports:{}};new Function('require','module','exports',js)(id=>modules[id]||native(id),mod,mod.exports);return mod.exports;}
const schema=await compile('lib/deck-memory-save-schema.ts');
const id=randomUUID(),ramp=randomUUID();let owner=true,calls=[];
let memory={id,cards:[],categories:[],revision:0,decisions:{}};
const supabase={rpc:async(name,input)=>{
 calls.push({name,input});
 if(input.p_revision!==memory.revision)return {error:{message:'This deck changed in another tab. Reload before saving.'}};
 memory={...memory,cards:input.p_cards,categories:input.p_categories,decisions:input.p_decisions,revision:memory.revision+1};
 return {error:null};
}};
const handlers=await compile('app/api/deck-memories/[id]/route.ts',{
 '@/lib/deck-memory-save-schema':schema,
 '@/lib/deck-memory-server':{ownedMemory:async()=>{if(!owner)throw new Error('Your deck memory was not found.');return {memory,supabase};},loadMemory:async()=>({memory,owner})},
});
const context={params:Promise.resolve({id})};
const patch=body=>handlers.PATCH(new Request('http://localhost/api/deck-memories/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),context);
const card={key:'shock',name:'Shock',count:3,oracleId:null,printingId:null,imageUrl:'https://cards.scryfall.io/normal/front/test.jpg',showcase:true,typeLine:'Instant',verified:true,edited:true,sources:[],allocations:[{categoryId:'sideboard',count:1},{categoryId:ramp,count:1}]};
const body={revision:0,title:'Draft',note:'',cards:[card],categories:[{id:ramp,name:'Removal',zone:'main',order:1}],decisions:{},confirm:false,incomplete:true,acknowledged:true};
let response=await patch(body);assert.equal(response.status,200);
assert.deepEqual(calls[0].input.p_categories,body.categories);assert.deepEqual(calls[0].input.p_cards[0].allocations,card.allocations);
let loaded=await (await handlers.GET(new Request('http://localhost'),context)).json();
assert.deepEqual(loaded.memory.cards,body.cards);assert.deepEqual(loaded.memory.categories,body.categories);
assert.equal(loaded.memory.revision,1);
let before=calls.length;
const {categories:_omitted,...oldBody}=body;
response=await patch({...oldBody,revision:1,cards:[{...card,allocations:undefined}]});assert.equal(response.status,400);assert.equal(calls.length,before,'Old clients cannot erase organization');
response=await patch({...body,revision:1,categories:[]});assert.equal(response.status,400);assert.equal(calls.length,before,'Dangling allocations fail before RPC');
response=await patch(body);assert.equal(response.status,400);assert.equal(memory.revision,1,'Stale save never mutates newer organization');
owner=false;before=calls.length;response=await patch({...body,revision:1});assert.equal(response.status,400);assert.equal(calls.length,before,'Only owner can save');
console.log('Save API passed: atomic RPC payload, category/allocation retrieval, legacy-write guard, invalid/stale saves and owner checks.');
