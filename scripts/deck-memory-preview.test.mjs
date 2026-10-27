import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import ts from 'typescript';
const native=createRequire(import.meta.url),mod={exports:{}};let clients=0;
const source=ts.transpileModule(await readFile('utils/supabase/middleware.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('require','module','exports',source)(id=>id==='@supabase/ssr'?{createServerClient:()=>{clients++;return {auth:{getUser:async()=>({data:{user:{id:'mock-user'}}})}};}}:native(id),mod,mod.exports);
const before={node:process.env.NODE_ENV,preview:process.env.DECK_MEMORY_PREVIEW};
const request=path=>({headers:new Headers(),nextUrl:new URL('http://localhost:3012'+path),cookies:{get(){},set(){}}});
try {
 process.env.NODE_ENV='development';process.env.DECK_MEMORY_PREVIEW='true';
 await mod.exports.updateSession(request('/dev/deck-memory'));assert.equal(clients,0,'Isolated fixture creates no anonymous users');
 for(const path of ['/decks','/dev/deck-memory/other'])await mod.exports.updateSession(request(path));
 assert.equal(clients,2,'Other development routes retain normal authorization');
 process.env.NODE_ENV='production';await mod.exports.updateSession(request('/dev/deck-memory'));assert.equal(clients,3,'Production never bypasses auth');
 process.env.NODE_ENV='development';process.env.DECK_MEMORY_PREVIEW='false';await mod.exports.updateSession(request('/dev/deck-memory'));assert.equal(clients,4,'Development flag is mandatory');
 console.log('Preview isolation passed: exact flagged development fixture only; real and production routes retain normal auth.');
} finally {for(const [key,value] of [['NODE_ENV',before.node],['DECK_MEMORY_PREVIEW',before.preview]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
