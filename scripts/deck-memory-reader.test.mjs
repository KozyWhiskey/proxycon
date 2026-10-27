// Mocked transport by default. --live sends TWO fixture photos to Gemini only.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import dotenv from 'dotenv';
import sharp from 'sharp';
const nativeRequire=createRequire(import.meta.url);
async function compile(path,modules={}) {
  const js=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const mod={exports:{}};
  new Function('require','module','exports',js)(id=>id==='server-only'?{}:modules[id]||nativeRequire(id),mod,mod.exports);
  return mod.exports;
}
const core=await compile('lib/deck-memory.ts');
const errors=await compile('lib/deck-memory-errors.ts');
const originalFetch=globalThis.fetch;
let reply,request,requests=0;
const fakeFetch=async(_url,init)=>{requests++;request=JSON.parse(init.body);return new Response(JSON.stringify(reply.body),{status:reply.status||200,headers:{'Content-Type':'application/json'}});};
const live=process.argv.includes('--live');
if(live) dotenv.config({path:'.env.local',quiet:true});
else globalThis.fetch=fakeFetch;
const reader=await compile('lib/deck-memory-reader.ts',{
  '@ai-sdk/google':{google:createGoogleGenerativeAI({...(!live?{apiKey:'mock-key'}:{})})},
  './deck-memory-config':{readerConfiguration:()=>({google:{available:true,model:process.env.DECK_GOOGLE_MODEL||'gemini-3.8-flash'}})},
  './deck-memory-catalog':{resolveMemoryCard:async(name,count)=>core.manualCard(name,count)},
  './deck-memory':core,
});
try {
  if(live) {
    if(!process.env.GOOGLE_GENERATIVE_AI_API_KEY) throw new Error('Gemini key is required.');
    const labels=JSON.parse(await readFile('scripts/fixtures/deck-memories/labels.json','utf8'));
    const results=[];
    for(const photo of labels.photos.filter(p=>(!process.argv.includes('--draft-only')||p.id==='draft-duplicates')&&(!process.argv.includes('--cube-only')||p.id==='cube-overlap')).slice(0,2)) {
      const bytes=await sharp(await readFile('scripts/fixtures/deck-memories/'+photo.file)).rotate().resize({width:3000,height:3000,fit:'inside',withoutEnlargement:true}).jpeg({quality:94}).toBuffer();
      const started=Date.now();
      try {
        const result=await reader.readMemoryPhoto('google',bytes,'Any Magic card is allowed.');
        const expected=new Map(photo.cards.map(([name,count])=>[core.normalizedName(name),count]));
        const actual=new Map(result.observations.map(o=>[core.normalizedName(o.name),o.count]));
        const correct=[...expected.keys()].filter(n=>actual.has(n));
        results.push({photo:photo.id,status:'ready',latencyMs:result.latency,visibleEntries:actual.size,labeledTitles:expected.size,matchedTitles:correct.length,matchedQuantities:correct.filter(n=>actual.get(n)===expected.get(n)).length,usage:result.usage});
      } catch(error) {
        // Only request-validation guidance, never the SDK error/request or a full response.
        let configurationIssue;
        if ([400,404,422].includes(error.statusCode)) {
          try {
            const message=JSON.parse(error.responseBody).error?.message;
            if (typeof message==='string') configurationIssue=message.replace(/[A-Za-z0-9+/=_-]{35,}/g,'[redacted]').slice(0,1200);
          } catch {}
        }
        results.push({photo:photo.id,status:'failed',category:errors.deckReaderFailure(error),diagnostics:errors.deckReaderDiagnostics(error),httpStatus:error.statusCode,latencyMs:Date.now()-started,...(configurationIssue?{configurationIssue}:{})});
      }
    }
    await mkdir('.next-verify',{recursive:true});
    await writeFile('.next-verify/gemini-request-review.json',JSON.stringify({createdAt:new Date().toISOString(),model:process.env.DECK_GOOGLE_MODEL||'gemini-3.8-flash',provisional:true,results},null,2));
    console.log(JSON.stringify(results,null,2));
  } else {
    const card={title:'Swamp',name:'Swamp',count:1,box_2d:[100,200,600,500],uncertainName:false,uncertainCount:false};
    const response=(cards=[card],finishReason='STOP')=>({candidates:[{content:{role:'model',parts:[{text:JSON.stringify({warnings:[],cards})}]},finishReason}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:20,thoughtsTokenCount:5,totalTokenCount:125}});
    reply={body:response()};
    const result=await reader.readMemoryPhoto('google',new Uint8Array([1,2,3]),'Independent pool hint');
    const schema=request.generationConfig.responseSchema;
    assert.equal(request.generationConfig.responseJsonSchema,undefined);
    assert.equal(request.generationConfig.responseMimeType,'application/json');
    // This adapter's wire schema omits bounds. Descriptions must survive, and
    // strict application validation below must reject invalid quantities/regions.
    assert.match(schema.properties.cards.items.properties.box_2d.description,/0 to 1000/);
    assert.match(schema.properties.cards.items.properties.count.description,/never hidden/);
    assert.equal(schema.$schema,undefined);
    assert.equal(request.generationConfig.thinkingConfig.thinkingLevel,'low');
    assert.equal(request.generationConfig.maxOutputTokens,10000);
    assert.equal(result.observations.length,1);
    assert.deepEqual(result.observations[0].region,{x:0.2,y:0.1,width:0.3,height:0.5});
    const {box_2d:_box,...plain}=card;
    assert.deepEqual(reader.normalizePhotoObservation('openai',{warnings:[],cards:[{...plain,region:{x:0.2,y:0.1,width:0.3,height:0.5}}]}).cards[0].region,result.observations[0].region,'Providers produce the same canonical coordinates');
    assert.equal(result.usage.outputTokens,25,'Thinking tokens remain billable');
    reply={body:response([{...card,count:0}])};
    await assert.rejects(()=>reader.readMemoryPhoto('google',new Uint8Array([1]),''),e=>errors.deckReaderFailure(e)==='response_invalid');
    reply={body:response([{...card,box_2d:[0,0,1200,200]}])};
    await assert.rejects(()=>reader.readMemoryPhoto('google',new Uint8Array([1]),''),e=>errors.deckReaderFailure(e)==='response_invalid');
    assert.throws(()=>reader.normalizePhotoObservation('google',{warnings:[],cards:[{...card,box_2d:[200,200,100,300]}]}),'Inverted boxes are rejected');
    assert.throws(()=>reader.normalizePhotoObservation('google',{warnings:[],cards:[{...card,box_2d:[0,0,10]}]}),'Incomplete boxes are rejected');
    reply={body:{candidates:[{content:{role:'model',parts:[{text:'{"cards":['}]},finishReason:'MAX_TOKENS'}]}};
    await assert.rejects(()=>reader.readMemoryPhoto('google',new Uint8Array([1]),''),e=>errors.deckReaderFailure(e)==='response_truncated');
    reply={status:503,body:{error:{code:503,message:'Service unavailable',status:'UNAVAILABLE'}}};
    const before=requests;
    await assert.rejects(()=>reader.readMemoryPhoto('google',new Uint8Array([1]),''),e=>errors.deckReaderFailure(e)==='reader_upstream');
    assert.equal(requests,before+1,'No automatic paid retry');
    assert.equal(errors.deckReaderFailure({cause:{code:'ECONNRESET'}}),'reader_network');
    assert.equal(errors.deckReaderFailure({statusCode:400}),'reader_configuration');
    assert.equal(errors.deckReaderFailure({statusCode:429}),'reader_limited');
    assert.equal(errors.deckReaderFailure({cause:{name:'AbortError'}}),'reader_timeout');
    const diagnostic=errors.deckReaderDiagnostics({finishReason:'stop',text:'secret image',cause:{issues:[{path:['cards',12,'region','width'],code:'too_big',received:'private'},{path:['secret'],code:'too_big'}]}});
    assert.deepEqual(diagnostic,['Reader finish: stop.','Invalid field: cards.12.region.width (too_big).']);
    console.log('Reader transport tests passed: production request, region/count instructions, strict validation, token accounting, truncation, sanitized diagnostics, upstream/network errors and no automatic retries.');
  }
} finally {globalThis.fetch=originalFetch;}
