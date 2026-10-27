// Opt-in paid evaluation. Never logs keys, signed URLs, or full provider responses.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import sharp from 'sharp';
import dotenv from 'dotenv';
dotenv.config({path:'.env.local',quiet:true});

const fixtureRoot=resolve('scripts/fixtures/deck-memories');
const fixture=JSON.parse(await readFile(join(fixtureRoot,'labels.json'),'utf8'));
const modelIds={google:process.env.DECK_GOOGLE_MODEL||'gemini-3.8-flash',openai:process.env.DECK_OPENAI_MODEL||'gpt-6.1-sol'};
const live=process.argv.includes('--live');
const output=resolve('.next-verify/deck-memory-evaluation.json');
if(!live) {
 console.log(JSON.stringify({mode:'dry run',photos:fixture.photos.map(p=>({id:p.id,status:p.status,cards:p.cards.length})),models:modelIds,
  next:'Use --live to send these images to BOTH paid providers. Results are provisional until labels and a larger photo set are reviewed.'},null,2));
 process.exit(0);
}
if(!process.env.OPENAI_API_KEY||!process.env.GOOGLE_GENERATIVE_AI_API_KEY) throw new Error('Both provider keys are required.');
// Reuse the production prompt/schema instead of maintaining a different benchmark prompt.
let reader=await readFile('lib/deck-memory-reader.ts','utf8');
reader=reader.slice(reader.indexOf('export const photoObservationSchema'),reader.indexOf('export async function readMemoryPhoto'));
const transpiled=ts.transpileModule(`import {z} from 'zod';\n${reader}`,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const temp=resolve('.next-verify/deck-reader-eval-schema.mjs');await mkdir(resolve('.next-verify'),{recursive:true});await writeFile(temp,transpiled);
const {readerSchema,readerPrompt,normalizePhotoObservation}=await import(pathToFileURL(temp));
const normalized=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const excluded=s=>/^(snow covered )?(plains|island|swamp|mountain|forest|wastes)$/.test(normalized(s))||normalized(s)==='dark maelstrom';
const results=[];
for(const photo of fixture.photos) {
 const image=await sharp(await readFile(join(fixtureRoot,photo.file))).rotate().resize({width:3000,height:3000,fit:'inside',withoutEnlargement:true}).jpeg({quality:94}).toBuffer();
 const runs=await Promise.all(['google','openai'].map(async provider=>{
  const start=Date.now();
  try {
   const result=await generateObject({model:provider==='google'?google(modelIds.google):openai.responses(modelIds.openai),schema:readerSchema(provider),
    maxRetries:0,maxOutputTokens:provider==='google'?10000:6000,providerOptions:provider==='google'?{google:{thinkingConfig:{thinkingLevel:'low'}}}:undefined,abortSignal:AbortSignal.timeout(60_000),system:readerPrompt(provider),
    messages:[{role:'user',content:[{type:'text',text:'Read this photo independently. Any Magic card is allowed.'},{type:'image',image,mediaType:'image/jpeg',providerOptions:{openai:{imageDetail:'high'}}}]}]});
   const observations=normalizePhotoObservation(provider,result.object).cards;
   const expected=new Map(photo.cards.map(([name,count])=>[normalized(name),count]));
   const actual=new Map(observations.filter(c=>c.name.trim()&&!excluded(c.name)).map(c=>[normalized(c.name),c.count]));
   const correct=[...actual.keys()].filter(n=>expected.has(n));
   return {provider,model:modelIds[provider],latencyMs:Date.now()-start,usage:result.usage,
    precision:correct.length/Math.max(1,actual.size),recall:correct.length/expected.size,
    quantityCorrect:correct.filter(n=>actual.get(n)===expected.get(n)).length,
    missed:[...expected.keys()].filter(n=>!actual.has(n)),unexpected:[...actual.keys()].filter(n=>!expected.has(n)),
    observations};
  }catch(error){return {provider,model:modelIds[provider],error:String(error.message).slice(0,250),latencyMs:Date.now()-start};}
 }));
 const matches=runs.every(r=>!r.error)?runs[0].observations.filter(a=>runs[1].observations.some(b=>normalized(a.name)===normalized(b.name)&&a.count===b.count)).length:null;
 results.push({photo:photo.id,labelStatus:photo.status,imageSha256:createHash('sha256').update(image).digest('hex'),runs,matchingObservations:matches});
 console.log(photo.id,runs.map(r=>`${r.provider}: ${r.error?'failed':`${Math.round(r.recall*100)}% provisional recall`}`).join('; '));
}
await writeFile(output,JSON.stringify({createdAt:new Date().toISOString(),provisional:true,results},null,2));
console.log('Saved local evaluation:',output);
