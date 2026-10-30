import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import ts from 'typescript';
process.on('uncaughtException',error=>{console.error(error.stack);process.exit(1);});

async function compile(path,dependencies={}) {
  const code=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const m={exports:{}};new Function('require','module','exports',code)(id=>{if(id in dependencies)return dependencies[id];throw Error('Unexpected dependency '+id);},m,m.exports);return m.exports;
}
const rules=await compile('lib/weekend.ts');
const view=await compile('lib/event-board-view.ts',{'./weekend':rules});
const {historyRows}=await compile('lib/event-history.ts',{'@/lib/player-session':{},'@/lib/event-board':view,'@/lib/weekend':rules});
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.user',true),'')::uuid$$;
create table profiles(id uuid primary key,display_name text,username text);
create table event_members(event_id uuid,profile_id uuid);
create table tournaments(id uuid primary key,event_id uuid,name text,is_archived boolean);
create table matches(id uuid primary key,event_id uuid,tournament_id uuid,round_number int,table_number int,table_label text,game_type text,format_label text,started_at timestamptz,completed_at timestamptz,played_on date,is_final bool,is_rematch bool,created_at timestamptz);
create table match_participants(id uuid primary key,match_id uuid,profile_id uuid,participant_id uuid,result text,games_won int,deck_id uuid,team int,seat_number int,finish_order int,created_at timestamptz);
grant usage on schema public,auth to authenticated;grant select on all tables in schema public to authenticated;
alter table matches enable row level security;create policy visible on matches for select to authenticated using(event_id=nullif(current_setting('test.event',true),'')::uuid);
alter table match_participants enable row level security;create policy visible on match_participants for select to authenticated using(exists(select 1 from matches m where m.id=match_id));
`);
const migration=await readFile('scripts/sql/weekend_performance.sql','utf8');await db.exec(migration);await db.exec(migration);
const id=n=>'10000000-0000-4000-8000-'+n.toString(16).padStart(12,'0');
const event=id(1),other=id(2),tournament=id(3),archived=id(4),players=Array.from({length:12},(_,i)=>id(10+i));
for(let i=0;i<12;i++){await db.query('insert into profiles values($1,$2,$3)',[players[i],i===1?'Álex':i===2?'':`Player ${i}`,i===2?'Fallback user':null]);await db.query('insert into event_members values($1,$2)',[event,players[i]]);}
await db.query('insert into tournaments values($1,$2,$3,false),($4,$2,$5,true)',[tournament,event,'Friday draft',archived,'Archived title']);
const formats=['commander','commander_15','commander_30','cedh','planechase','archenemy','two_headed_giant','emperor','star','standard','custom','set_draft'];
const matches=[],seats=[];
for(let i=0;i<360;i++){
 const tid=i%12===11?(i%24===11?tournament:archived):null;
 const m={id:id(1000+i),event_id:i===359?other:event,tournament_id:tid,round_number:tid?1:null,table_number:tid?1:null,table_label:null,game_type:formats[i%12],format_label:i%19===0?'100% custom':null,started_at:'2026-10-30T10:00:00.000Z',completed_at:i%17===0?null:'2026-10-30T20:00:00.000Z',played_on:i%2?'2026-10-29':null,is_final:i===11,is_rematch:false,created_at:new Date(Date.UTC(2026,9,30,12,0,i%20)).toISOString()};matches.push(m);
 await db.query('insert into matches values('+Object.values(m).map((_,j)=>'$'+(j+1)).join(',')+')',Object.values(m));
 const n=i===23?1:i===31?0:4;
 for(let k=0;k<n;k++){
  const seat={id:id(10000+i*4+k),match_id:m.id,profile_id:i===47&&k===0?null:players[(i+k)%12],participant_id:null,result:i%29===0&&k===3?null:k?'loss':'win',games_won:k?1:2,deck_id:null,team:null,seat_number:null,finish_order:null,created_at:m.created_at};seats.push(seat);
  await db.query('insert into match_participants values('+Object.values(seat).map((_,j)=>'$'+(j+1)).join(',')+')',Object.values(seat));
 }
}
const b={event:{id:event},members:[],names:new Map(players.map((p,i)=>[p,i===1?'Álex':i===2?'Fallback user':`Player ${i}`])),tournaments:[{id:tournament,name:'Friday draft'}],matches:matches.filter(m=>m.event_id===event),seats,roster:[],decks:[],prizes:[]};
assert(seats.length>1000);
await db.query("select set_config('test.user',$1,false),set_config('test.event',$2,false)",[players[0],event]);await db.exec('set role authenticated');
let checks=0;
for(const format of ['all','commander','team','tournament','other'])for(const day of ['all','2026-10-29','2026-10-30'])for(const search of ['','player 0','friday','100%','álex']){
 const q={format,day,q:search};const expected=historyRows(b,q);const actual=(await db.query('select weekend_history_page($1,$2,$3,$4,$5,$6,$7) value',[event,20,day,'all',format,'all',search])).rows[0].value;
 assert.equal(actual.total,expected.rows.length,JSON.stringify(q));assert.deepEqual(actual.matches.map(m=>m.id),expected.rows.slice(0,20).map(m=>m.id),JSON.stringify(q));assert.deepEqual(actual.days,expected.days);checks++;
}
for(const q of [{player:players[0]},{tournament},{tournament:archived},{player:'no-such-player'},{day:'not-a-date'},{q:'%_'},{limit:40},{limit:1000}]){
 const expected=historyRows(b,q),limit=q.limit||20;const actual=(await db.query('select weekend_history_page($1,$2,$3,$4,$5,$6,$7) value',[event,limit,q.day||'all',q.player||'all','all',q.tournament||'all',q.q||''])).rows[0].value;
 assert.equal(actual.total,expected.rows.length);assert.deepEqual(actual.matches.map(m=>m.id),expected.rows.slice(0,limit).map(m=>m.id));assert(actual.seats.every(s=>actual.matches.some(m=>m.id===s.match_id)));checks++;
}
assert.equal((await db.query('select weekend_history_page($1) value',[other])).rows[0].value.total,0,'Invoker RLS must exclude another event');
await db.exec('reset role');const security=(await db.query("select prosecdef from pg_proc where proname='weekend_history_page'")).rows[0];assert.equal(security.prosecdef,false);
await db.close();console.log('History equivalence passed:',checks,'filter/page combinations, >1000 seats, legacy timestamps, byes/finals, literal search, stable ties, repeatable migration and invoker RLS.');
