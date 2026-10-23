import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function moduleAt(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
}
const { eventCapabilities } = await moduleAt('../lib/event-capabilities.ts');
const { matchOutcome, matchesResultSnapshot, validTournamentScore } = await moduleAt('../lib/match-outcome.ts');
const unbound = { authenticated: true, playerId: null, house: false, admin: false, member: false };
assert.deepEqual(eventCapabilities(unbound), { joined: false, canManage: false, house: false });
assert.deepEqual(eventCapabilities({ ...unbound, house: true }), { joined: false, canManage: true, house: true });
assert.deepEqual(eventCapabilities({ ...unbound, authenticated: false, house: true, admin: true }), { joined: false, canManage: false, house: false });
assert.deepEqual(eventCapabilities({ ...unbound, playerId: 'chris', member: true }), { joined: true, canManage: true, house: false });
assert.equal(eventCapabilities({ ...unbound, playerId: 'chris', member: false }).canManage, false);
assert.equal(eventCapabilities({ ...unbound, admin: true }).canManage, true);

const players = [{ profile_id: 'chris', team: null }, { profile_id: 'scott', team: null }];
assert.deepEqual([...matchOutcome(players, undefined, false, ['chris']).winners], ['chris']);
assert.equal(matchOutcome(players, undefined, true, []).draw, true);
assert.deepEqual([...matchOutcome(players, { chris: 1, scott: 2 }, false, ['chris']).winners], ['scott']);
assert.equal(matchOutcome(players, { chris: 1, scott: 1 }, false, ['chris']).draw, true);
assert.equal(matchOutcome(players, { chris: 0, scott: 0 }, false, ['chris']).draw, false);
assert.deepEqual([...matchOutcome(players, undefined, false, ['someone-else']).winners], []);
assert.deepEqual(matchOutcome(players, { chris: 2.7, scott: -1 }, false, []).games, { chris: 2, scott: 0 });
const team = [{ profile_id: 'chris', team: 1 }, { profile_id: 'scott', team: 1 }, { profile_id: 'sid', team: 2 }, { profile_id: 'miko', team: 2 }];
assert.deepEqual([...matchOutcome(team, undefined, false, ['sid', 'miko']).winners], ['sid', 'miko']);
const recorded = [{ profile_id: 'chris', result: 'win', games_won: 2 }, { profile_id: 'scott', result: 'loss', games_won: 1 }];
const snapshot = [{ profileId: 'chris', result: 'win', gamesWon: 2 }, { profileId: 'scott', result: 'loss', gamesWon: 1 }];
assert.equal(matchesResultSnapshot(recorded, snapshot), true);
assert.equal(matchesResultSnapshot([...recorded].reverse(), snapshot), true);
assert.equal(matchesResultSnapshot(recorded, [{ ...snapshot[0], result: 'loss' }, snapshot[1]]), false);
assert.equal(matchesResultSnapshot(recorded, [{ ...snapshot[0], gamesWon: 1 }, snapshot[1]]), false);
assert.equal(matchesResultSnapshot(recorded, [snapshot[0], snapshot[0]]), false);
console.log('UX flow tests passed: house/member boundaries, score previews, team results and stale corrections.');

// Tournament scores are required; quick-game winner-only reports remain supported above.
const scoreIds = ['chris', 'scott'];
for (const score of [{ chris: 2, scott: 0 }, { chris: 2, scott: 1 }, { chris: 0, scott: 2 }, { chris: 1, scott: 1 }]) {
  assert.equal(validTournamentScore(scoreIds, score), true);
}
for (const score of [undefined, {}, { chris: 0, scott: 0 }, { chris: 2 }, { chris: 2, scott: -1 }, { chris: 2.5, scott: 1 }, { chris: Infinity, scott: 1 }, { chris: NaN, scott: 0 }]) {
  assert.equal(validTournamentScore(scoreIds, score), false);
}
assert.equal(validTournamentScore(['chris'], { chris: 2 }), false);
assert.deepEqual([...matchOutcome(players, { chris: 2, scott: 0 }, false, []).winners], ['chris']);
assert.deepEqual([...matchOutcome(players, { chris: 2, scott: 1 }, false, []).winners], ['chris']);
assert.deepEqual([...matchOutcome(players, { chris: 1, scott: 2 }, false, []).winners], ['scott']);
console.log('Required tournament score validation passed: 2–0, 2–1, draws, empty/invalid scores and byes.');
