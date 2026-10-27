import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';

const nativeRequire=createRequire(import.meta.url);
const memoryId=randomUUID(),photoId=randomUUID(),player=randomUUID();
const memory={id:memoryId,tournament_id:randomUUID(),revision:3,cards:[{name:'Swamp',count:9}]};
const photo={id:photoId,memory_id:memoryId,status:'ready',recognition_key:'owned/read.jpg',normalized_key:'owned/photo.jpg'};
const attempts=[];const dispatches=[];const downloads=[];let allowOwner=true,googleAvailable=true;
let googleFailure=new Error('Billing failure');
function query(table) {
 let patch=null,filters=[],descending=false;
 const rows=()=>table==='deck_memory_attempts'?attempts:table==='deck_memory_photos'?[photo]:table==='tournaments'?[{set_codes:[],cube_list:null,singleton:false}]:[];
 const execute=()=>{
  let found=rows().filter(row=>filters.every(([key,value])=>row[key]===value));
  if(descending) found=found.slice().reverse();
  if(patch) for(const row of found) Object.assign(row,patch);
  return {data:found[0]||null,error:null};
 };
 const builder={select(){return builder;},eq(key,value){filters.push([key,value]);return builder;},is(key,value){filters.push([key,value]);return builder;},
  update(value){patch=value;return builder;},order(){descending=true;return builder;},limit(){return builder;},single:async()=>execute(),maybeSingle:async()=>execute(),
  then(resolve,reject){return Promise.resolve(execute()).then(resolve,reject);}};
 return builder;
}
const admin={from:query,rpc:async(_name,input)=>{
 let row=attempts.find(a=>a.request_key===input.p_key&&a.provider===input.p_provider);
 if(!row){row={id:randomUUID(),memory_id:input.p_memory,photo_id:input.p_photo,provider:input.p_provider,model:input.p_model,
  request_key:input.p_key,analysis_key:input.p_group,selection:input.p_selection,purpose:input.p_purpose,status:'processing',error_category:null,
  created_at:new Date().toISOString(),region:input.p_region,observations:[]};attempts.push(row);}
 return {data:{...row},error:null};
}};
const failureSource=ts.transpileModule(await readFile('lib/deck-memory-errors.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const failureModule={exports:{}};new Function('module','exports',failureSource)(failureModule,failureModule.exports);
assert.equal(failureModule.exports.deckReaderFailure({name:'AI_NoObjectGeneratedError',finishReason:'length'}),'response_truncated');
assert.equal(failureModule.exports.deckReaderFailure({name:'AI_NoObjectGeneratedError',finishReason:'stop'}),'response_invalid');
assert.equal(failureModule.exports.deckReaderFailure({name:'TimeoutError'}),'reader_timeout');
const modules={
 '@/lib/deck-memory-errors':failureModule.exports,
 '@/lib/deck-memory-server':{ownedMemory:async()=>{if(!allowOwner)throw new Error('Your deck memory was not found.');return {playerId:player,memory,supabase:{from:query}};},loadMemory:async()=>({memory,attempts})},
 '@/lib/deck-memory-admin':{memoryAdmin:()=>admin},
 '@/lib/deck-memory-config':{readerConfiguration:()=>({google:{available:googleAvailable,model:'google-test'},openai:{available:true,model:'openai-test'}}),positiveSetting:(_key,fallback)=>fallback},
 '@/lib/deck-memory-images':{recognitionImage:async(key,region)=>{downloads.push({key,region});return new Uint8Array([1]);}},
 '@/lib/deck-memory-reader':{poolHint:()=>'',outsideCube:()=>false,readMemoryPhoto:async(provider,_bytes,hint)=>{dispatches.push({provider,hint});if(provider==='google')throw googleFailure;return {observations:[],warnings:[],usage:{inputTokens:100,outputTokens:100},latency:20};}},
 '@/lib/deck-memory-catalog':{tournamentCardPool:async()=>null},
 '@/lib/activity':{isBasicLand:()=>false},
};
const source=await readFile('app/api/deck-memories/[id]/analyze/route.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const compiledModule={exports:{}};new Function('require','module','exports',js)(id=>modules[id]||nativeRequire(id),compiledModule,compiledModule.exports);
const {POST}=compiledModule.exports;
const context={params:Promise.resolve({id:memoryId})};
const base={photoId,choice:'both',key:randomUUID(),purpose:'check',revision:3};
const post=body=>POST(new Request('http://localhost/api/deck-memories/test/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),context);
let response=await post(base);assert.equal(response.status,200);
assert.deepEqual(dispatches.map(c=>c.provider).sort(),['google','openai']);
assert.ok(dispatches.every(c=>!c.hint.includes('Swamp')),'Existing list must not bias independent readings');
assert.equal(attempts.find(a=>a.provider==='openai').status,'ready');
assert.equal(attempts.find(a=>a.provider==='google').status,'failed');
await post(base);assert.equal(dispatches.length,2,'Replaying an idempotency key cannot dispatch again');
const failed=attempts.find(a=>a.provider==='google');
googleFailure={name:'AI_NoObjectGeneratedError',finishReason:'stop',text:'private provider text',cause:{issues:[{path:['cards',1,'region','width'],code:'too_big',received:'private'}]}};
await post({...base,key:randomUUID(),retryOf:failed.id});
assert.equal(attempts.at(-1).error_category,'response_invalid');
assert.deepEqual(attempts.at(-1).warnings,['Reader finish: stop.','Invalid field: cards.1.region.width (too_big).']);
assert.ok(attempts.at(-1).latency_ms>=0,'Failed requests retain elapsed time');
assert.equal(dispatches.length,3);assert.equal(dispatches.at(-1).provider,'google');
assert.equal(attempts.at(-1).analysis_key,base.key,'Retry remains in original comparison group');
assert.equal(attempts.filter(a=>a.provider==='openai').length,1,'Successful provider is never repeated during retry');
response=await post({...base,key:randomUUID(),retryOf:attempts.find(a=>a.provider==='openai').id});assert.equal(response.status,400);
const before=dispatches.length;
googleAvailable=false;
response=await post({...base,key:randomUUID()});assert.equal(response.status,400);assert.equal(dispatches.length,before);
response=await post({...base,choice:'openai',key:randomUUID(),purpose:'additional'});assert.equal(response.status,200);assert.equal(dispatches.at(-1).provider,'openai');
response=await post({...base,choice:'openai',key:randomUUID(),photoId:randomUUID()});assert.equal(response.status,400);
allowOwner=false;
response=await post({...base,choice:'openai',key:randomUUID()});assert.equal(response.status,400);
assert.deepEqual(memory.cards,[{name:'Swamp',count:9}]);
assert.ok(downloads.every(d=>d.key.startsWith('owned/')));
console.log('API tests passed: owner validation, stored photos only, independent dispatch, explicit selection, partial failures, idempotency, retry-only-failed, and no deck mutations.');
