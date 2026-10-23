// Opt-in live integration QA. Writes only new QA tournaments inside an explicitly named disposable event.
// Usage: node scripts/qa-sealed-integration.mjs <disposable-event-id>
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ts from 'typescript';

dotenv.config({ path: '.env.local', quiet: true });
const eventId = process.argv[2];
assert.match(eventId || '', /^[a-f0-9-]{36}$/i, 'Pass an explicit disposable QA event ID.');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const auth = must(await db.auth.signInAnonymously());
must(await db.rpc('assume_house'));
const context = must(await db.rpc('current_player_context'));
assert.equal(context.mode, 'house');
const event = must(await db.from('events').select('id,name').eq('id', eventId).single());
assert.match(event.name, /^QA Disposable/);
const members = must(await db.from('event_members').select('profile_id').eq('event_id', eventId));
assert.ok(members.length >= 5);

// Compile the actual server action module. Only request-bound context/cache are substituted.
const nativeRequire = createRequire(import.meta.url);
const modules = new Map();
async function compile(path, additions = '') {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const js = ts.transpileModule(source + additions, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  const localRequire = id => modules.has(id) ? modules.get(id) : nativeRequire(id);
  new Function('require', 'module', 'exports', js)(localRequire, mod, mod.exports);
  return mod.exports;
}
modules.set('@/lib/weekend', await compile('../lib/weekend.ts'));
modules.set('@/lib/match-outcome', await compile('../lib/match-outcome.ts'));
modules.set('next/cache', { revalidatePath() {} });
modules.set('@/lib/player-session', { resolvePlayer: async () => ({ supabase: db, authUser: auth.user, playerId: null, mode: 'house', isAdmin: false }) });
const actions = await compile('../app/weekend/actions.ts', '\nexport { historyOf as qaHistoryOf };\n');
const pass = label => console.log(`PASS ${label}`);
async function call(name, ...args) {
  const result = await actions[name](...args);
  assert.equal(result.success, true, `${name}: ${result.message}`);
  return result;
}
const created = await call('createWeekendTournament', { eventId, name: `QA Sealed integration ${new Date().toISOString()}`, format: 'sealed', maxRounds: 3, podCount: 1, prize1st: 'QA first', roundDuration: 1 });
const tournamentId = created.tournamentId;
console.log(`QA tournament ${tournamentId}`);
for (const member of members.slice(0, 5)) await call('addTournamentPlayer', tournamentId, member.profile_id);
const roster = () => db.from('tournament_participants').select('*').eq('tournament_id', tournamentId).then(must);
const matches = () => db.from('matches').select('*').eq('tournament_id', tournamentId).order('round_number').then(must);
const seats = ids => db.from('match_participants').select('*').in('match_id', ids).then(must);
const participants = await roster();
assert.ok(participants.every(p => p.draft_seat === null));
await call('postPairings', tournamentId);
let rows = await matches();
assert.equal(rows.length, 3);
let s = await seats(rows.map(m => m.id));
assert.ok(s.every(p => p.result === null));
const swapA = s[0], swapB = s.find(p => p.match_id !== swapA.match_id);
await call('swapSealedPair', tournamentId, swapA.participant_id, swapB.participant_id);
s = await seats(rows.map(m => m.id));
assert.equal(s.find(p => p.id === swapA.id).match_id, swapB.match_id);
await call('clearPairings', tournamentId);
assert.equal((await matches()).length, 0);
await call('postPairings', tournamentId);
pass('five-player sealed has no seats; random post, swap, clear and repost');
await call('startRound', tournamentId);
rows = await matches(); s = await seats(rows.map(m => m.id));
let bye = rows.find(m => s.filter(p => p.match_id === m.id).length === 1);
assert.equal(s.find(p => p.match_id === bye.id).result, 'win');
assert.ok(bye.started_at && bye.completed_at);
assert.equal((await actions.addTournamentPlayer(tournamentId, members[5]?.profile_id || members[0].profile_id)).success, false);
pass('start locks field and records odd bye automatically');
await call('pauseRoundClock', tournamentId);
await call('resumeRoundClock', tournamentId);
pass('clock pause and resume');

// Keep a real loss against the eventual dropped player, to catch accidental conversion to a bye.
const normal = rows.filter(m => m.id !== bye.id);
const game1 = s.filter(p => p.match_id === normal[0].id);
const eventualDrop = game1[0], realLoser = game1[1];
await call('reportMatch', { matchId: normal[0].id, winnerIds: [eventualDrop.profile_id] });
await call('reportMatch', { matchId: normal[1].id, draw: true });
const drawSeats = await seats([normal[1].id]);
assert.ok(drawSeats.every(p => p.result === 'draw' && p.games_won === null));
rows = await matches();
assert.equal(rows.filter(m => m.round_number === 2).length, 3);
assert.ok(rows.filter(m => m.round_number === 2).every(m => !m.started_at));
pass('scoreless win and scoreless draw persist; next Swiss round posts automatically');
await call('startRound', tournamentId);
await call('dropPlayer', tournamentId, eventualDrop.participant_id);
const dropped = (await roster()).find(p => p.id === eventualDrop.participant_id);
assert.equal(dropped.dropped, true);
rows = await matches();
const round2 = rows.filter(m => m.round_number === 2);
s = await seats(round2.map(m => m.id));
const droppedSeat = s.find(p => p.participant_id === eventualDrop.participant_id);
if (s.filter(p => p.match_id === droppedSeat.match_id).length === 2) {
  assert.equal(droppedSeat.result, 'loss');
  assert.equal(s.find(p => p.match_id === droppedSeat.match_id && p.id !== droppedSeat.id).result, 'win');
}
const history = await actions.qaHistoryOf(db, tournamentId);
const preserved = history.find(h => (h.player1 === realLoser.participant_id && h.player2 === eventualDrop.participant_id) || (h.player2 === realLoser.participant_id && h.player1 === eventualDrop.participant_id));
assert.ok(preserved, 'REGRESSION: Swiss history must preserve an actual match against a dropped opponent, not turn the surviving player into a bye win.');
assert.equal(preserved.player1 === realLoser.participant_id ? preserved.result1 : preserved.result2, 'loss');
pass('drop awards opponent win; prior loss against dropped opponent remains a real loss for Swiss');
for (const match of round2) {
  const ss = await seats([match.id]);
  if (ss.some(p => !p.result)) await call('reportMatch', { matchId: match.id, winnerIds: [ss[0].profile_id] });
}
rows = await matches();
const round3 = rows.filter(m => m.round_number === 3);
assert.equal(round3.length, 2);
s = await seats(round3.map(m => m.id));
assert.ok(s.every(p => p.participant_id !== eventualDrop.participant_id));
await call('startRound', tournamentId);
for (const match of round3) {
  await call('reportMatch', { matchId: match.id, draw: true });
}
pass('dropped player excluded from subsequent Swiss round');
async function finish() {
  let result = await actions.finishTournament({ tournamentId });
  if (result.needsOrder) result = await actions.finishTournament({ tournamentId, order: result.needsOrder.flat() });
  assert.equal(result.success, true, result.message);
}
await finish();
let tournament = must(await db.from('tournaments').select('*').eq('id', tournamentId).single());
assert.equal(tournament.status, 'completed');
assert.deepEqual((await roster()).map(p => p.place).sort(), [1,2,3,4,5]);
pass('finish resolves any podium ties and persists all five places including dropped player');
await call('reportMatch', { matchId: normal[1].id, winnerIds: [drawSeats[0].profile_id] });
tournament = must(await db.from('tournaments').select('*').eq('id', tournamentId).single());
assert.equal(tournament.status, 'active');
assert.equal(tournament.prize_1st, 'QA first');
assert.ok((await roster()).every(p => p.place === null));
const fixedRound3 = round3.map(m => m.id).sort();
assert.deepEqual((await matches()).filter(m => m.round_number === 3).map(m => m.id).sort(), fixedRound3);
await finish();
assert.equal(must(await db.from('tournaments').select('status').eq('id', tournamentId).single()).status, 'completed');
pass('post-finish correction reopens, clears places, keeps prizes and started pairings; finish again persists');
console.log(`COMPLETE ${tournamentId}`);

const early = await call('createWeekendTournament', { eventId, name: `QA Sealed early finish ${new Date().toISOString()}`, format: 'sealed', maxRounds: 3, podCount: 1 });
const earlyId = early.tournamentId;
console.log(`QA early-finish tournament ${earlyId}`);
for (const member of members.slice(0, 4)) await call('addTournamentPlayer', earlyId, member.profile_id);
await call('postPairings', earlyId);
await call('startRound', earlyId);
const earlyRows = must(await db.from('matches').select('*').eq('tournament_id', earlyId));
for (const match of earlyRows) {
  const ss = await seats([match.id]);
  await call('reportMatch', { matchId: match.id, winnerIds: [ss[0].profile_id] });
}
const posted = must(await db.from('matches').select('*').eq('tournament_id', earlyId));
assert.equal(posted.filter(m => m.round_number === 2 && !m.started_at).length, 2);
let earlyFinish = await actions.finishTournament({ tournamentId: earlyId });
if (earlyFinish.needsOrder) earlyFinish = await actions.finishTournament({ tournamentId: earlyId, order: earlyFinish.needsOrder.flat() });
assert.equal(earlyFinish.success, true, earlyFinish.message);
const remaining = must(await db.from('matches').select('*').eq('tournament_id', earlyId));
assert.equal(remaining.filter(m => !m.started_at).length, 0, 'REGRESSION: Finish early must discard unstarted future pairings, so no ghost live slips remain.');
assert.equal(remaining.length, earlyRows.length, 'All played results stay after early Finish.');
pass('early finish removes unstarted future pairings while preserving all played results');
console.log(`COMPLETE early ${earlyId}`);

assert.ok(members.length >= 6);
const pods = await call('createWeekendTournament', { eventId, name: `QA Two pods fill ${new Date().toISOString()}`, format: 'set_draft', maxRounds: 3, podCount: 2 });
for (const member of members.slice(0, 6)) await call('addTournamentPlayer', pods.tournamentId, member.profile_id);
await call('randomizeSeats', pods.tournamentId, 'fill');
const podRoster = must(await db.from('tournament_participants').select('*').eq('tournament_id', pods.tournamentId));
assert.deepEqual([1,2].map(pod => podRoster.filter(p => p.pod === pod).length), [3,3]);
assert.deepEqual(podRoster.map(p => p.draft_seat).sort(), [1,2,3,4,5,6]);
pass('two-pod fill seats six initially unseated players in a balanced 3+3 split');
console.log(`COMPLETE pods ${pods.tournamentId}`);
