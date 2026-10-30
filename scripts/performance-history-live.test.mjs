import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {parse} from 'dotenv';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import ts from 'typescript';
if(process.env.PROXYCON_PERFORMANCE_FIXTURE!=='true'||!process.env.PERFORMANCE_MANIFEST)throw Error('An explicitly authorized disposable performance fixture is required.');
const env=parse(await readFile('.env.local','utf8'));
assert.equal(new URL(env.NEXT_PUBLIC_SUPABASE_URL).origin,'https://apnwvugvwlfopxtryjwk.supabase.co');
const fixture=JSON.parse(await readFile(process.env.PERFORMANCE_MANIFEST,'utf8'));
const client=createServerClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>fixture.cookies,setAll:()=>{}}});
const ok=r=>{if(r.error)throw Error('History validation read failed: '+r.error.code);return r.data;};
assert.equal(ok(await client.from('events').select('name').eq('id',fixture.events[0]).single()).name,fixture.marker);
async function all(table,filter){const rows=[];for(let offset=0;;offset+=500){const page=ok(await filter(client.from(table).select('*')).order('id').range(offset,offset+499));rows.push(...page);if(page.length<500)return rows;}}
const [matches,seats,tournaments,members]=await Promise.all([
 all('matches',q=>q.eq('event_id',fixture.events[0])),
 all('match_participants',q=>q.in('profile_id',fixture.profiles)),
 all('tournaments',q=>q.eq('event_id',fixture.events[0]).or('is_archived.eq.false,is_archived.is.null')),
 client.from('event_members').select('profile_id,profile:profiles(display_name,username)').eq('event_id',fixture.events[0]).then(ok),
]);
const board={matches,seats,tournaments,names:new Map(members.map(x=>{const p=Array.isArray(x.profile)?x.profile[0]:x.profile;return[x.profile_id,p?.display_name||p?.username||'Player'];}))};
async function compile(path,deps={}){const code=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const m={exports:{}};new Function('require','module','exports',code)(id=>{if(id in deps)return deps[id];throw Error('Unexpected import '+id);},m,m.exports);return m.exports;}
const rules=await compile('lib/weekend.ts'),view=await compile('lib/event-board-view.ts',{'./weekend':rules});
const {historyRows,historyLimit}=await compile('lib/event-history.ts',{'@/lib/player-session':{},'@/lib/event-board':view,'@/lib/weekend':rules});
const queries=[{}, {limit:'40'},{limit:'1000'},{limit:'1'},{day:'2026-10-30'},{day:'1900-01-01'},{player:fixture.profiles[0]},{player:'00000000-0000-4000-8000-000000000000'},{tournament:fixture.tournament},{tournament:'00000000-0000-4000-8000-000000000000'},{q:'Performance draft'},{q:'Performance player 2'},{q:'  Performance draft  '},{q:'%_'},...['commander','tournament','team','other'].flatMap(format=>[{format},{format,player:fixture.profiles[0]},{format,day:'2026-10-30',limit:'40'}])];
const samples=[];
for(const q of queries){const before=performance.now();const page=ok(await client.rpc('weekend_history_page',{p_event:fixture.events[0],p_limit:historyLimit(q),p_day:q.day||'all',p_player:q.player||'all',p_format:q.format||'all',p_tournament:q.tournament||'all',p_search:(q.q||'').trim()}));const expected=historyRows(board,q),rows=expected.rows.slice(0,historyLimit(q));assert.equal(Number(page.total),expected.rows.length);assert.deepEqual(page.days,expected.days);assert.deepEqual(page.matches.map(x=>x.id),rows.map(x=>x.id));for(const m of page.matches){const original=matches.find(x=>x.id===m.id);for(const [key,value]of Object.entries(m))assert.deepEqual(value,original[key]);}const expectedSeats=seats.filter(x=>rows.some(m=>m.id===x.match_id));assert.deepEqual(page.seats.map(x=>x.id).sort(),expectedSeats.map(x=>x.id).sort());for(const s of page.seats){const original=seats.find(x=>x.id===s.id);for(const [key,value]of Object.entries(s))assert.deepEqual(value,original[key]);}samples.push({ms:Math.round(performance.now()-before),matches:page.matches.length,seats:page.seats.length,bytes:Buffer.byteLength(JSON.stringify(page))});}
const empty=ok(await client.rpc('weekend_history_page',{p_event:'00000000-0000-4000-8000-000000000000'}));assert.equal(Number(empty.total),0);assert.deepEqual(empty.matches,[]);assert.deepEqual(empty.seats,[]);
const anon=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const denied=await anon.rpc('weekend_history_page',{p_event:fixture.events[0]});assert.equal(denied.error?.code,'42501');
const sorted=samples.map(x=>x.ms).sort((a,b)=>a-b);const summary={checks:['Authenticated RPC matches direct RLS-visible records, canonical filters, count, days, ordering, scores and seat data','Limits retain existing minimum/load-more behavior','Unknown event returns no records','Unauthenticated execution is denied'],queryCases:queries.length,matches:matches.length,seats:seats.length,medianRpcMs:Math.round((sorted[Math.floor((sorted.length-1)/2)]+sorted[Math.ceil((sorted.length-1)/2)])/2),samples,errors:[]};
if(process.env.PERF_HISTORY_OUTPUT)await writeFile(process.env.PERF_HISTORY_OUTPUT,JSON.stringify(summary,null,2)+'\n');
console.log('Live history passed:',queries.length,'filter/page cases,',matches.length,'matches,',seats.length,'seats; anonymous denied; median RPC',summary.medianRpcMs+'ms.');
