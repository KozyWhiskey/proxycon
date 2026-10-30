import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import ts from 'typescript';
const native=createRequire(import.meta.url);
async function compile(path,mocks={}){
 const code=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod={exports:{}};new Function('require','module','exports',code)(id=>mocks[id]||native(id),mod,mod.exports);return mod.exports;
}
const rules=await compile('lib/weekend.ts');
const placement=await compile('lib/tournament-placement.ts');
const outcome=await compile('lib/match-outcome.ts');
let mode='house',tables;
function reset(){
 tables={tournaments:[{id:'draft',event_id:'event',format:'set_draft',status:'active',field_locked:true}],
 tournament_participants:['a','b','c','d','e','f'].map(id=>({id,profile_id:'profile-'+id,tournament_id:'draft',dropped:false})),
 matches:[0,1,2].map(n=>({id:'match-'+n,tournament_id:'draft',is_final:false,round_number:1,started_at:'2026-10-29T18:00Z',table_number:n+1})),
 match_participants:['a','d','b','e','c','f'].map((id,i)=>({participant_id:id,profile_id:'profile-'+id,match_id:'match-'+Math.floor(i/2),result:i%2?'loss':'win'})),event_members:[]};
}
const db={from(table){let tests=[],insert=null,update=null,single=false,limit=Infinity;const q={
 select(){return q;},eq(key,val){tests.push(r=>r[key]===val);return q;},in(key,vals){tests.push(r=>vals.includes(r[key]));return q;},limit(n){limit=n;return q;},
 insert(value){insert=Array.isArray(value)?value:[value];return q;},update(value){update=value;return q;},single(){single=true;return q;},maybeSingle(){single=true;return q;},
 then(resolve){if(insert){insert=insert.map((r,i)=>({id:'insert-'+i,...r}));tables[table].push(...insert);}const rows=(insert||tables[table]).filter(r=>tests.every(t=>t(r))).slice(0,limit);if(update)for(const row of rows)Object.assign(row,update);return Promise.resolve({data:single?rows[0]||null:rows,error:null}).then(resolve);}
 };return q;}};
const actions=await compile('app/weekend/actions.ts',{'@/lib/weekend':rules,'@/lib/tournament-placement':placement,'@/lib/match-outcome':outcome,
 'next/cache':{revalidatePath(){}},'@/lib/player-session':{resolvePlayer:async()=>({supabase:db,authUser:{id:'device'},playerId:mode==='player'?'profile-a':null,mode,isAdmin:false})}});
reset();const absent=await actions.addFinal('draft');assert.equal(absent.success,false);assert.equal(absent.needsOrder[0].length,3);assert.equal(tables.matches.length,3);
assert.equal((await actions.addFinal('draft',['b','a','a'])).success,false);
assert.equal((await actions.addFinal('draft',['c','a','b'])).success,true);
assert.deepEqual(tables.match_participants.filter(p=>p.match_id==='insert-0').map(p=>p.participant_id),['c','a']);
assert.equal(tables.tournament_participants.some(p=>p.place),false,'Adding a final never confirms places');
assert.equal((await actions.addFinal('draft',['c','a','b'])).success,false,'Existing final cannot be posted twice');
for(const p of tables.match_participants.filter(p=>p.match_id==='insert-0'))p.result=p.participant_id==='c'?'win':'loss';
assert.equal((await actions.finishTournament({tournamentId:'draft',order:['b','c','a','d','e','f']})).success,true);
assert.deepEqual(tables.tournament_participants.filter(p=>p.place<=2).sort((a,b)=>a.place-b.place).map(p=>p.id),['c','a'],'Final fixes first/second independent of original tied ordering');
assert.equal(tables.tournaments[0].status,'completed');
reset();tables.match_participants[0].result=null;assert.equal((await actions.addFinal('draft',['a','b','c'])).success,false,'Open matches block a final');
reset();mode='player';assert.equal((await actions.addFinal('draft',['a','b','c'])).success,false,'Nonmember cannot post a final');
console.log('Final action passed: tied order reaches finalists, invalid orders rejected, no confirmed places, open-round and membership guards, existing final protection.');
