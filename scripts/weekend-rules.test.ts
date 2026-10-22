import assert from 'node:assert/strict';
import {
  buildEventStats,
  buildRecords,
  chicagoToday,
  chartSeatCount,
  clockwiseOrder,
  clockSecondsLeft,
  draftPodRound1,
  draftRound1,
  finalHasWinner,
  emptyDraftSeats,
  manualTieGroups,
  matchWinPercentage,
  opponentMatchWin,
  pairAcross,
  podForSeat,
  rankPlayers,
  resolveTieOrder,
  selectBye,
  streakFor,
  suggestedRounds,
  swissPairings,
  type HistoryMatch,
  type SeatPlayer,
} from '../lib/weekend.ts';

function seats(ids: number[], pod = 1): SeatPlayer[] {
  return ids.map((seat) => ({ id: `p${seat}`, seat, pod }));
}

const eight = pairAcross(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']).map((pair) => [pair.player1, pair.player2]);
assert.deepEqual(eight, [['p1', 'p5'], ['p2', 'p6'], ['p3', 'p7'], ['p4', 'p8']]);

const six = draftPodRound1(seats([1, 2, 3, 4, 5, 6]), () => 0);
assert.deepEqual(six.map((pair) => [pair.player1, pair.player2]), [['p1', 'p4'], ['p2', 'p5'], ['p3', 'p6']]);

const seven = draftPodRound1(seats([1, 2, 3, 4, 5, 6, 7]), (count) => 2 % count);
assert.deepEqual(seven.map((pair) => [pair.player1, pair.player2]), [
  ['p1', 'p5'],
  ['p2', 'p6'],
  ['p4', 'p7'],
  ['p3', null],
]);

let calls = 0;
const twoPods = draftRound1(
  [...seats([1, 2, 3], 1), ...seats([4, 5, 6], 2)],
  () => {
    calls += 1;
    return 0;
  }
);
assert.equal(twoPods.filter((pair) => pair.player2 === null).length, 2);

assert.equal(suggestedRounds(8), 3);
assert.equal(suggestedRounds(12), 4);

const history: HistoryMatch[] = [
  { player1: 'a', player2: null, result1: 'win', result2: null },
  { player1: 'b', player2: 'a', result1: 'win', result2: 'loss' },
];
const records = buildRecords(['a', 'b'], history);
assert.equal(records.get('a')?.points, 3);
assert.equal(records.get('a')?.byes, 1);
assert.equal(records.get('a')?.nonByePoints, 0);
assert.equal(opponentMatchWin(records.get('a')!, records), 1);
assert.equal(matchWinPercentage(records.get('a')!), 0);

const ranked = rankPlayers(['a', 'b'], [
  { player1: 'a', player2: 'b', result1: 'win', result2: 'loss' },
]);
assert.equal(ranked[0].id, 'a');
assert.equal(manualTieGroups(ranked, [{ player1: 'a', player2: 'b', result1: 'win', result2: 'loss' }]).length, 0);

const tied = rankPlayers(['a', 'b', 'c'], []);
assert.equal(manualTieGroups(tied, []).length, 1);
assert.deepEqual(manualTieGroups(tied, [])[0].sort(), ['a', 'b', 'c']);

const bye = selectBye(
  [
    { id: 'high', points: 6, byes: 0, seat: 1 },
    { id: 'low', points: 0, byes: 0, seat: 4 },
  ],
  () => 0,
  false
);
assert.equal(bye, 'low');

const repeatBye = selectBye(
  [
    { id: 'seat2', points: 0, byes: 1, seat: 2 },
    { id: 'seat8', points: 0, byes: 1, seat: 8 },
  ],
  () => 0,
  false
);
assert.equal(repeatBye, 'seat8');

const paired = swissPairings(
  [
    { id: 'a', points: 0, byes: 0, seat: 1 },
    { id: 'b', points: 0, byes: 0, seat: 2 },
    { id: 'c', points: 0, byes: 0, seat: 3 },
    { id: 'd', points: 0, byes: 0, seat: 4 },
  ],
  [{ player1: 'a', player2: 'b', result1: 'win', result2: 'loss' }],
  () => 0,
  false
);
const rematch = paired.some((pair) => pair.rematch);
assert.equal(rematch, false);
assert.equal(paired.length, 2);

assert.deepEqual(streakFor(['win', 'win', 'draw', 'win']), { current: 1, best: 2 });
assert.deepEqual(streakFor(['win', 'loss']), { current: 0, best: 1 });
assert.deepEqual(streakFor(['win', 'win']), { current: 2, best: 2 });

const stats = buildEventStats({
  start: '2026-10-22',
  end: '2026-10-25',
  profiles: ['a', 'b'],
  tournamentPlaces: [],
  games: [
    {
      matchId: 'm1',
      profileId: 'a',
      result: 'win',
      gameType: 'commander',
      tournament: false,
      bye: false,
      playedOn: '2026-10-22',
      createdAt: '1',
      commander: 'Atraxa & Thrasios',
      opponents: ['b'],
    },
    {
      matchId: 'm1',
      profileId: 'b',
      result: 'loss',
      gameType: 'commander',
      tournament: false,
      bye: false,
      playedOn: '2026-10-22',
      createdAt: '1',
      commander: 'Atraxa & Thrasios',
      opponents: ['a'],
    },
  ],
});
assert.equal(stats.commanderByCommander[0].name, 'Atraxa & Thrasios');
assert.equal(stats.commanderByCommander[0].wins, 1);
assert.equal(stats.headToHead[0].commander, '1–0');

const pod = buildEventStats({
  start: null,
  end: null,
  profiles: ['miko', 'craig', 'scott', 'beta'],
  tournamentPlaces: [],
  games: ['miko', 'craig', 'scott', 'beta'].map((profileId) => ({
    matchId: 'pod',
    profileId,
    result: (profileId === 'miko' ? 'win' : 'loss') as 'win' | 'loss',
    gameType: 'commander',
    tournament: false,
    bye: false,
    playedOn: '2026-10-21',
    createdAt: '1',
    commander: null,
    opponents: ['miko', 'craig', 'scott', 'beta'].filter((id) => id !== profileId),
  })),
});
const podPairs = pod.headToHead.map((row) => [row.a, row.b].sort().join('-')).sort();
assert.deepEqual(podPairs, ['beta-miko', 'craig-miko', 'miko-scott']);
assert.ok(pod.headToHead.every((row) => row.commander === '1–0' || row.commander === '0–1'));
assert.ok(stats.days.includes('2026-10-25'));
assert.equal(stats.mostCommanderWins?.profileId, 'a');
assert.equal(stats.matchRates[0]?.profileId, 'a');
assert.equal(stats.mostPlayed?.profileId, 'a');
assert.equal(stats.mostPlayed?.played, 1);

const titled = buildEventStats({
  start: null,
  end: null,
  profiles: ['a'],
  games: [],
  tournamentPlaces: [
    { tournamentId: 't1', profileId: 'a', place: 1, points: 9, wins: 3, losses: 0, draws: 0 },
    { tournamentId: 't2', profileId: 'a', place: 2, points: 6, wins: 2, losses: 1, draws: 0 },
  ],
});
assert.equal(titled.titles?.count, 1);

assert.equal(chartSeatCount([1, 2, 3], 3), 4);
assert.equal(chartSeatCount([], 0), 4);
assert.equal(chartSeatCount([0, 0, 0], 3), 4);
assert.equal(chartSeatCount([1, 2, 3, 4, 5, 6], 6), 6);
assert.equal(chartSeatCount([1, 2, 9], 3), 9);
assert.equal(chartSeatCount([1], 6), 4);
assert.equal(podForSeat(2, 2, 8), 1);
assert.equal(podForSeat(2, 5, 8), 2);
assert.equal(podForSeat(1, 2, 8), 1);

assert.deepEqual(clockwiseOrder([1, 2, 3, 4, 5, 6, 7, 8]), {
  top: [1, 2, 3, 4],
  bottom: [8, 7, 6, 5],
});
const started = Date.parse('2026-10-21T18:00:00Z');
assert.equal(clockSecondsLeft({
  durationMinutes: 50,
  anchor: '2026-10-21T18:00:00Z',
  pausedAt: null,
  remainingSeconds: 3000,
}, started + 65_000), 2935);
assert.equal(clockSecondsLeft({
  durationMinutes: 50,
  anchor: '2026-10-21T18:00:00Z',
  pausedAt: '2026-10-21T18:01:00Z',
  remainingSeconds: 2940,
}, started + 120_000), 2940);

assert.match(chicagoToday(new Date('2026-10-22T04:30:00Z')), /^2026-10-21$/);


// An optional final cannot award places until it has a decisive result.
assert.equal(finalHasWinner([null, null]), false);
assert.equal(finalHasWinner(['win', null]), false);
assert.equal(finalHasWinner(['draw', 'draw']), false);
assert.equal(finalHasWinner(['win', 'win']), false);
assert.equal(finalHasWinner(['win', 'loss']), true);
assert.equal(finalHasWinner(['loss', 'win']), true);

// Finishing tied groups requires every name, with distinct ranks in each group.
assert.equal(resolveTieOrder([['a', 'b']], {}), null);
assert.equal(resolveTieOrder([['a', 'b']], { a: '1', b: '1' }), null);
assert.equal(resolveTieOrder([['a', 'b']], { a: '0', b: '2' }), null);
assert.equal(resolveTieOrder([['a', 'b']], { a: '1.5', b: '2' }), null);
assert.equal(resolveTieOrder([['a', 'b']], { a: '1', b: '3' }), null);
assert.deepEqual(resolveTieOrder([['a', 'b'], ['c', 'd']], { a: '2', b: '1', c: '1', d: '2' }), ['b', 'a', 'c', 'd']);
assert.deepEqual(resolveTieOrder([], {}), []);

// Fill empty must use holes in the visible chart before adding higher seat numbers.
assert.deepEqual(emptyDraftSeats([], [], 0), [1, 2, 3, 4]);
assert.deepEqual(emptyDraftSeats([3, 0, 0, 0, 0, 0], [3], 6), [1, 2, 4]);
assert.deepEqual(emptyDraftSeats([1, 2, 4, 5, 6, 0], [1, 2, 4, 5, 6], 6), [3]);
assert.deepEqual(emptyDraftSeats([1, 2, 3, 7], [1, 2, 3], 3), [4, 5, 6, 7]);

console.log('weekend rules ok');
