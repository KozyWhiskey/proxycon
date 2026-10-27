import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import ts from 'typescript';
import sharp from 'sharp';

const nativeRequire=createRequire(import.meta.url);
const objects=new Map();const updates=[];const cleanup=[];
const admin={storage:{from:()=>({download:async key=>objects.has(key)?{data:new Blob([objects.get(key)])}:{error:new Error('missing')},upload:async(key,bytes)=>{objects.set(key,bytes);return {};}})},
 from:table=>({update:value=>({eq:()=>({select:()=>({maybeSingle:async()=>{updates.push(value);return {data:{id:'photo'}};}})})}),upsert:async value=>{cleanup.push({table,value});return {};}})};
const input=await readFile('lib/deck-memory-images.ts','utf8');
const js=ts.transpileModule(input,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const compiledModule={exports:{}};
new Function('require','module','exports',js)(name=>name==='server-only'?{}:name==='./deck-memory-admin'?{memoryAdmin:()=>admin}:nativeRequire(name),compiledModule,compiledModule.exports);
const {normalizeMemoryPhoto,recognitionImage}=compiledModule.exports;
const photo={id:'photo',memory_id:'memory',raw_key:'memory/photo/original',normalized_key:null,recognition_key:null,status:'pending'};
for(const format of ['jpeg','png','webp']) {
 const original=await sharp({create:{width:3400,height:2100,channels:3,background:'#cccccc'}})[format]().toBuffer();
 objects.set(photo.raw_key,original);
 const result=await normalizeMemoryPhoto(photo);
 assert.equal(result.status,'ready');
 assert.equal(result.width,3400);
 const normalized=await sharp(objects.get(result.normalized_key)).metadata();
 assert.equal(normalized.format,'jpeg');assert.equal(normalized.exif,undefined);
 const recognition=await sharp(objects.get(result.recognition_key)).metadata();
 assert.equal(recognition.width,3000);
 const crop=await recognitionImage(result.normalized_key,{x:0.5,y:0.25,width:0.5,height:0.5});
 const cropped=await sharp(crop).metadata();assert.ok(cropped.width<=1800&&cropped.height<=1800);
}
const rotated=await sharp({create:{width:100,height:200,channels:3,background:'#eeeeee'}}).withMetadata({orientation:6}).jpeg().toBuffer();
objects.set(photo.raw_key,rotated);
const oriented=await normalizeMemoryPhoto(photo);assert.equal(oriented.width,200);assert.equal(oriented.height,100);
objects.set(photo.raw_key,Buffer.from('not an image'));
await assert.rejects(()=>normalizeMemoryPhoto(photo),/could not be read/);
objects.set(photo.raw_key,Buffer.alloc(20*1024*1024+1));
await assert.rejects(()=>normalizeMemoryPhoto(photo),/smaller than 20 MB/);
assert.ok(cleanup.some(c=>c.value.object_key===photo.raw_key));
if(process.argv.includes('--heic')) {
 objects.set(photo.raw_key,await readFile('.next-verify/example.heic'));
 const result=await normalizeMemoryPhoto(photo);
 assert.equal(result.status,'ready');assert.equal((await sharp(objects.get(result.normalized_key)).metadata()).format,'jpeg');
 console.log('Actual libheif HEIC fixture converted successfully.');
}
console.log('Image tests passed: decoded formats, invalid/oversized files, orientation, metadata stripping, recognition sizing, crops, and original cleanup.');
