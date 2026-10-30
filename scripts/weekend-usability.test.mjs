import assert from 'node:assert/strict';import ts from 'typescript';import {readFile} from 'node:fs/promises';const modules=new Map();async function moduleAt(path){if(modules.has(path))return modules.get(path);let source=await readFile(new URL('../'+path,import.meta.url),'utf8');let code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;for(const dep of ['weekend','event-board-view','weekend-view','weekend-statistics','recap','display-day'])if(code.includes("'./"+dep+"'")){const m=await moduleAt('lib/'+dep+'.ts');code=code.replace("'./"+dep+"'",JSON.stringify(m.url));}const url='data:text/javascript;base64,'+Buffer.from(code).toString('base64');const value={...await import(url),url};modules.set(path,value);return value;}
const {safeNext}=await moduleAt('lib/continuation.ts');for(const v of ['https://evil.example','//evil.example','/\\evil','/%2fevil','/%5cevil','/%0aevil'])assert.equal(safeNext(v),'/');assert.equal(safeNext('/invite/ABC?x=1'),'/invite/ABC?x=1');
const {encounterStats}=await moduleAt('lib/weekend-statistics.ts');const games=['a','b','c','d'].map(profileId=>({matchId:'pod',profileId,result:profileId==='a'?'win':'loss',gameType:'commander',tournament:false,bye:false,playedOn:'2026-10-24',createdAt:'',opponents:[]}));const pairs=encounterStats(games);const bothLost=pairs.find(p=>p.a==='b'&&p.b==='c');assert.equal(bothLost.commander.shared,1);assert.equal(bothLost.commander.neither,1);assert.equal(bothLost.commander.a,0);assert.equal(pairs.find(p=>p.a==='a'&&p.b==='b').commander.a,1);assert.equal(encounterStats([{...games[0],tournament:true,bye:true}]).length,0);
const {recapPages}=await moduleAt('lib/recap-pages.ts');const lines=Array.from({length:80},(_,i)=>'Long player '+i+' '+('x'.repeat(150)));const pages=recapPages({lines});assert(pages.length>3);assert(pages.every(p=>p.length<=28&&p.every(l=>l.length<=68)));const contents=pages.flat().join('').replace(/ /g,'');assert(contents.includes('Longplayer79'));console.log('Weekend domain tests passed: safe continuation, shared pods, byes, long-name export pagination.');

const {weekendFixture}=await moduleAt('scripts/fixtures/weekend-preview.ts');const {personalAssignments,eventDateState,boardGames}=await moduleAt('lib/weekend-view.ts');const fixture=weekendFixture('playing');assert.equal(personalAssignments(fixture)[0].action,'Report result');assert.equal(personalAssignments(weekendFixture('posted'))[0].action,'View match');assert(personalAssignments(weekendFixture('waiting'))[0].title.includes('waiting'));assert(personalAssignments(weekendFixture('waiting'))[0].detail.includes('3 tables still open'));assert.equal(personalAssignments(weekendFixture('setup'))[0].title,'Draft seat 1');assert.equal(personalAssignments(weekendFixture('finished'))[0].action,'View final results');assert.equal(eventDateState({start_date:'2026-10-23',end_date:'2026-10-25',is_active:true},'2026-10-27'),'Past dates');assert.equal(boardGames(weekendFixture('playing')).length,0);assert.equal(boardGames(weekendFixture('finished')).length,8);console.log('Personal-state regressions passed: setup, posted, playing, waiting, finished, date state, completed-only stats.');

const finishedState=personalAssignments(weekendFixture('finished'));assert.equal(finishedState[0].inFlight,false);assert(personalAssignments(weekendFixture('waiting'))[0].inFlight,'Waiting for a running round remains operational');const dropped=weekendFixture('playing');dropped.roster[0].dropped=true;assert.equal(personalAssignments(dropped)[0].inFlight,false,'Dropped-player result moves out of current assignment');console.log('Current versus past personal game regressions passed.');

const mixedAssignments=personalAssignments(weekendFixture('mixed'));assert.equal(mixedAssignments.filter(a=>a.inFlight).length,1);assert.equal(mixedAssignments.filter(a=>!a.inFlight).length,1);assert(mixedAssignments.filter(a=>!a.inFlight)[0].title.includes('8'));console.log('Mixed active/completed event regression passed.');

const {orderTiedPlaces,finalPlaces}=await moduleAt('lib/tournament-placement.ts');
const ranked=['a','b','c','d','e'].map(id=>({id}));
assert.deepEqual(orderTiedPlaces(ranked,[['a','b','c']],['c','a','b']).map(p=>p.id),['c','a','b','d','e']);
assert.equal(orderTiedPlaces(ranked,[['a','b','c']],['a','b']),null);
assert.equal(orderTiedPlaces(ranked,[['a','b','c']],['a','b','b']),null);
assert.deepEqual(orderTiedPlaces(ranked,[],['e','a']).map(p=>p.id),ranked.map(p=>p.id),'Reviewed order cannot move untied places');
assert.deepEqual(orderTiedPlaces(ranked,[['a','b'],['d','e']],['b','a','e','d']).map(p=>p.id),['b','a','c','e','d']);
assert.deepEqual(finalPlaces(ranked,'d','c').map(p=>p.id),['d','c','a','b','e'],'Reviewed finalists finish first/second even when their original tied order was third/fourth');
assert.deepEqual(ranked.map(p=>p.id),['a','b','c','d','e'],'Final placing never mutates Swiss order');

const {resultText}=await moduleAt('lib/weekend-view.ts');
assert.equal(resultText([{name:'Loser',result:'loss',games_won:0},{name:'Winner',result:'win',games_won:2}]),'Winner defeated Loser · 2–0');
assert(resultText([{name:'A',result:'win',games_won:null},{name:'B',result:'loss',games_won:null}]).includes('Score not recorded'));
const boundary={lines:[...Array.from({length:26},(_,i)=>'Result '+i),'PLAYER RECORDS','Craig','  Commander: 1 / 0 / 0','  Tournament matches: 2 / 1 / 0','Miko','  Commander: 0 / 1 / 0']};
const groupedPages=recapPages(boundary);
assert(!groupedPages[0].includes('Craig'));
assert.deepEqual(groupedPages[1].slice(0,4),['PLAYER RECORDS','Craig','  Commander: 1 / 0 / 0','  Tournament matches: 2 / 1 / 0']);
const {makeRecap}=await moduleAt('lib/recap.ts');
const recap=makeRecap(weekendFixture('finished'));
assert(!recap.lines.some(l=>l.includes('Team games: No games')));
assert(recap.lines.some(l=>l.startsWith('  Tournament matches:')));
const {displayDay}=await moduleAt('lib/display-day.ts');
assert.equal(displayDay('2026-10-29'),'Thu, Oct 29, 2026');
console.log('QA review regressions passed: reviewed tie order, winner-first scores, missing scores, intact recap records, compact records, date-only labels.');
