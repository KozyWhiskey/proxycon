import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url),mod={exports:{}};
const source=ts.transpileModule(await readFile('lib/deck-memory-save-schema.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('require','module','exports',source)(require,mod,mod.exports);
const {deckSaveSchema}=mod.exports;
const id='50000000-0000-4000-8000-000000000001';
const card={key:'toy',name:'Toy',count:3,oracleId:null,printingId:null,imageUrl:null,typeLine:'Artifact Creature — Toy',verified:true,edited:true,sources:[],allocations:[{categoryId:'sideboard',count:1},{categoryId:id,count:1}]};
const body={revision:1,title:'My deck',note:'',cards:[card],categories:[{id,name:'Ramp',zone:'main',order:1}],decisions:{},confirm:false,incomplete:false,acknowledged:false};
assert.deepEqual(deckSaveSchema.parse(body).cards[0].allocations,card.allocations);
for(const patch of [
 {categories:[]},
 {categories:[{...body.categories[0],name:'  '}]},
 {categories:[{...body.categories[0],name:'Creatures'}]},
 {categories:[...body.categories,...body.categories]},
 {categories:[{id:'sideboard',name:'Reserve',zone:'main',order:1}]},
 {categories:[{id:'type-creatures',name:'Spell',zone:'main',order:1}]},
 {categories:[{id:'toString',name:'Invalid',zone:'main',order:1}]},
 {cards:[{...card,allocations:[{categoryId:'sideboard',count:4}]}]},
 {cards:[{...card,allocations:[{categoryId:'sideboard',count:1},{categoryId:'sideboard',count:1}]}]},
 {cards:[{...card,allocations:[{categoryId:'sideboard',count:0.5}]}]},
]) assert.equal(deckSaveSchema.safeParse({...body,...patch}).success,false,JSON.stringify(patch));
assert.equal(deckSaveSchema.safeParse({...body,categories:[{id:'sideboard',name:'Reserve',zone:'sideboard',order:0},...body.categories]}).success,true);
const {allocations:_alloc,...legacyCard}=card;
const {categories:_cats,...legacyBody}=body;
assert.equal(deckSaveSchema.safeParse({...legacyBody,cards:[legacyCard]}).success,true);
console.log('Save validation passed: category metadata, reserved identities/zones, split copies, dangling/overallocated/fractional copies, duplicates and legacy rows.');
