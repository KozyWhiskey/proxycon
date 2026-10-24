export type Result = 'win' | 'loss' | 'draw';

/** An optional final must decide a winner before places and prizes are assigned. */
export function finalHasWinner(results: (Result | null)[]) {
  return results.length === 2 && results.includes('win') && results.includes('loss');
}

/** Return an explicit order only when each tied group has ranks 1 through its size. */
export function resolveTieOrder(groups: string[][], values: Record<string, string>): string[] | null {
  const result: string[] = [];
  for (const group of groups) {
    const ranks = group.map(id => Number(values[id]));
    if (ranks.some(rank => !Number.isInteger(rank) || rank < 1 || rank > group.length) || new Set(ranks).size !== group.length) return null;
    result.push(...[...group].sort((a, b) => Number(values[a]) - Number(values[b])));
  }
  return result;
}

export const TOURNAMENT_FORMATS = ['set_draft', 'chaos_draft', 'cube', 'sealed'] as const;
export type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number];

export const QUICK_FORMATS = [
  { id: 'commander', label: 'Commander', min: 2, max: 6, teams: false },
  { id: 'commander_15', label: '$15', min: 2, max: 6, teams: false },
  { id: 'commander_30', label: '$30', min: 2, max: 6, teams: false },
  { id: 'cedh', label: 'cEDH', min: 2, max: 6, teams: false },
  { id: 'planechase', label: 'Planechase', min: 2, max: 6, teams: false },
  { id: 'archenemy', label: 'Archenemy', min: 2, max: 6, teams: false },
  { id: '1v1', label: '1v1', min: 2, max: 2, teams: false },
  { id: 'standard', label: 'Standard', min: 2, max: 2, teams: false },
  { id: 'two_headed_giant', label: 'Two-Headed Giant', min: 4, max: 4, teams: true },
  { id: 'emperor', label: 'Emperor', min: 3, max: 8, teams: true },
  { id: 'star', label: 'Star', min: 3, max: 8, teams: true },
  { id: 'jumpstart', label: 'Jumpstart', min: 2, max: 2, teams: false },
  { id: 'winston', label: 'Winston', min: 2, max: 3, teams: false },
  { id: 'pack_wars', label: 'Pack wars', min: 2, max: 3, teams: false },
  { id: 'custom', label: 'Custom', min: 2, max: 8, teams: false },
] as const;

export type QuickFormatId = (typeof QUICK_FORMATS)[number]['id'];

const COMMANDER_IDS = new Set(['commander', 'commander_15', 'commander_30', 'cedh', 'planechase', 'archenemy']);
const TEAM_IDS = new Set(['two_headed_giant', 'emperor', 'star']);

export function isTournamentFormat(format: string): format is TournamentFormat {
  return (TOURNAMENT_FORMATS as readonly string[]).includes(format);
}

export function tournamentLabel(format: string): string {
  switch (format) {
    case 'set_draft':
    case 'draft':
      return 'Set draft';
    case 'chaos_draft':
      return 'Chaos draft';
    case 'cube':
      return 'Cube';
    case 'sealed':
      return 'Sealed';
    default:
      return format;
  }
}

export function quickFormat(id: string) {
  return QUICK_FORMATS.find((format) => format.id === id) || QUICK_FORMATS[0];
}

export function isCommanderFormat(id: string) {
  return COMMANDER_IDS.has(id);
}

export function isTeamFormat(id: string) {
  return TEAM_IDS.has(id);
}

export function needsSeats(format: string) {
  return format === 'set_draft' || format === 'draft' || format === 'chaos_draft' || format === 'cube';
}

export function suggestedRounds(playerCount: number) {
  if (playerCount >= 9) return 4;
  if (playerCount >= 6) return 3;
  return 3;
}

export function chicagoToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function chicagoWeekday(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long',
  }).format(new Date(Date.UTC(year, month - 1, date, 18, 0, 0)));
}

export function eachDate(start: string, end: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  while (cursor <= last && days.length < 21) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export interface Pairing {
  player1: string;
  player2: string | null;
  rematch: boolean;
}

export interface SeatPlayer {
  id: string;
  seat: number;
  pod: number;
}

/** Low seat numbers across the top, left to right. The rest continue clockwise along the bottom. */
export function clockwiseOrder(seatNumbers: number[]): { top: number[]; bottom: number[] } {
  const sorted = [...seatNumbers].sort((a, b) => a - b);
  const topCount = Math.ceil(sorted.length / 2);
  return { top: sorted.slice(0, topCount), bottom: sorted.slice(topCount).reverse() };
}

/** A draft opens with four seats. Added seats and assigned numbers raise the chart. Unseated players stay off it until someone adds a seat or fills the empty ones. */
export function chartSeatCount(seatNumbers: number[], _joined: number) {
  const lastSeat = seatNumbers.reduce((max, seat) => Math.max(max, seat || 0), 0);
  return Math.max(4, lastSeat);
}

/** Include visible unclaimed seats, even when they do not have placeholder rows. */
export function emptyDraftSeats(seatNumbers: number[], claimed: number[], joined: number) {
  const occupied = new Set(claimed);
  return Array.from({ length: chartSeatCount(seatNumbers, joined) }, (_, index) => index + 1).filter(seat => !occupied.has(seat));
}

/** Two pods split the chart in half. Low seat numbers are pod 1. */
export function podForSeat(podCount: number, seat: number, seatCount: number) {
  if (podCount !== 2) return 1;
  return seat <= Math.ceil(Math.max(seatCount, 1) / 2) ? 1 : 2;
}

export interface ClockState {
  durationMinutes: number;
  anchor: string | null;
  pausedAt: string | null;
  remainingSeconds: number | null;
}

/** Seconds left on the round clock. A paused clock stays on the stored remaining time. */
export function clockSecondsLeft(clock: ClockState, nowMs: number): number | null {
  if (clock.remainingSeconds == null) return null;
  if (clock.pausedAt || !clock.anchor) return Math.max(0, clock.remainingSeconds);
  const anchor = Date.parse(clock.anchor);
  if (Number.isNaN(anchor)) return Math.max(0, clock.remainingSeconds);
  const elapsed = Math.floor((nowMs - anchor) / 1000);
  return Math.max(0, clock.remainingSeconds - Math.max(0, elapsed));
}

export function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

/** Shared Room / tournament live-state labels. Places still lock only on Finish. */
export type RoundPhaseStatus = 'live' | 'setup' | 'complete' | 'attention';
export type RoundPhase = {
  key: 'completed' | 'ready' | 'paused' | 'elapsed' | 'playing' | 'posted' | 'setup';
  label: string;
  short: string;
  status: RoundPhaseStatus;
};

export function tournamentRoundPhase(input: {
  tournamentStatus: string;
  readyToFinish: boolean;
  started: boolean;
  posted: boolean;
  round: number;
  pausedAt: string | null;
  remainingSeconds: number | null;
  clockRound: number | null;
  clockAnchor: string | null;
  durationMinutes: number;
  nowMs?: number;
}): RoundPhase {
  if (input.tournamentStatus === 'completed') {
    return { key: 'completed', label: 'Finished', short: 'Finished', status: 'complete' };
  }
  if (input.readyToFinish) {
    return { key: 'ready', label: 'All results in · ready to finish', short: 'Finish', status: 'complete' };
  }
  if (input.started) {
    const onClock = input.clockRound === input.round && input.remainingSeconds != null;
    if (onClock && input.pausedAt) {
      return { key: 'paused', label: 'Paused', short: 'Paused', status: 'attention' };
    }
    if (onClock) {
      const left = clockSecondsLeft({
        durationMinutes: input.durationMinutes,
        anchor: input.clockAnchor,
        pausedAt: input.pausedAt,
        remainingSeconds: input.remainingSeconds,
      }, input.nowMs ?? Date.now());
      if (left === 0) {
        return { key: 'elapsed', label: 'Time elapsed', short: 'Elapsed', status: 'attention' };
      }
    }
    return {
      key: 'playing',
      label: input.round ? `Round ${input.round} in progress` : 'Playing',
      short: 'Playing',
      status: 'live',
    };
  }
  if (input.posted) {
    return { key: 'posted', label: 'Pairings posted', short: 'Posted', status: 'setup' };
  }
  return { key: 'setup', label: 'Joining & seating', short: 'Setup', status: 'setup' };
}

export function pairAcross(orderedIds: string[]): Pairing[] {
  const half = Math.floor(orderedIds.length / 2);
  const pairs: Pairing[] = [];
  for (let index = 0; index < half; index += 1) {
    pairs.push({ player1: orderedIds[index], player2: orderedIds[index + half], rematch: false });
  }
  return pairs;
}

/** Round 1 inside one draft pod. An odd pod draws its bye at random, then the remaining seats pair across in seat order. */
export function draftPodRound1(players: SeatPlayer[], randomIndex: (count: number) => number): Pairing[] {
  const sorted = [...players].sort((a, b) => a.seat - b.seat);
  if (sorted.length < 2) return [];
  if (sorted.length % 2 === 1) {
    const byeAt = randomIndex(sorted.length);
    const bye = sorted[byeAt];
    const rest = sorted.filter((_, index) => index !== byeAt);
    return [
      ...pairAcross(rest.map((player) => player.id)),
      { player1: bye.id, player2: null, rematch: false },
    ];
  }
  return pairAcross(sorted.map((player) => player.id));
}

export function draftRound1(players: SeatPlayer[], random: () => number): Pairing[] {
  const pods = new Map<number, SeatPlayer[]>();
  for (const player of players) {
    const list = pods.get(player.pod) || [];
    list.push(player);
    pods.set(player.pod, list);
  }
  const pairings: Pairing[] = [];
  for (const pod of [...pods.keys()].sort((a, b) => a - b)) {
    pairings.push(...draftPodRound1(pods.get(pod) || [], (count) => Math.floor(random() * count)));
  }
  return pairings;
}

export function sealedRound1(playerIds: string[], random: () => number): Pairing[] {
  const shuffled = [...playerIds];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  const pairings: Pairing[] = [];
  for (let index = 0; index + 1 < shuffled.length; index += 2) {
    pairings.push({ player1: shuffled[index], player2: shuffled[index + 1], rematch: false });
  }
  if (shuffled.length % 2 === 1) {
    pairings.push({ player1: shuffled[shuffled.length - 1], player2: null, rematch: false });
  }
  return pairings;
}

export interface HistoryMatch {
  player1: string;
  player2: string | null;
  result1: Result;
  result2: Result | null;
}

export interface PlayerRecord {
  id: string;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  byes: number;
  nonByePoints: number;
  nonByeMatches: number;
  opponents: string[];
}

export function pointsFor(result: Result | null): number {
  if (result === 'win') return 3;
  if (result === 'draw') return 1;
  return 0;
}

export function buildRecords(playerIds: string[], history: HistoryMatch[]): Map<string, PlayerRecord> {
  const records = new Map<string, PlayerRecord>();
  for (const id of playerIds) {
    records.set(id, {
      id,
      points: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      byes: 0,
      nonByePoints: 0,
      nonByeMatches: 0,
      opponents: [],
    });
  }

  const add = (id: string, result: Result) => {
    const record = records.get(id);
    if (!record) return;
    record.points += pointsFor(result);
    if (result === 'win') record.wins += 1;
    else if (result === 'loss') record.losses += 1;
    else record.draws += 1;
  };

  for (const match of history) {
    if (!match.player2) {
      const record = records.get(match.player1);
      if (!record) continue;
      record.points += 3;
      record.wins += 1;
      record.byes += 1;
      continue;
    }
    add(match.player1, match.result1);
    if (match.result2) add(match.player2, match.result2);
    const first = records.get(match.player1);
    const second = records.get(match.player2);
    if (first) {
      first.nonByePoints += pointsFor(match.result1);
      first.nonByeMatches += 1;
      if (!first.opponents.includes(match.player2)) first.opponents.push(match.player2);
    }
    if (second && match.result2) {
      second.nonByePoints += pointsFor(match.result2);
      second.nonByeMatches += 1;
      if (!second.opponents.includes(match.player1)) second.opponents.push(match.player1);
    }
  }

  return records;
}

export function matchWinPercentage(record: PlayerRecord): number {
  if (record.nonByeMatches === 0) return 0;
  return record.nonByePoints / (record.nonByeMatches * 3);
}

export function opponentMatchWin(record: PlayerRecord, records: Map<string, PlayerRecord>): number {
  let sum = 0;
  let count = 0;
  for (const opponentId of record.opponents) {
    const opponent = records.get(opponentId);
    if (!opponent || opponent.nonByeMatches === 0) continue;
    sum += matchWinPercentage(opponent);
    count += 1;
  }
  return count === 0 ? 0 : sum / count;
}

export interface RankedPlayer {
  id: string;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  byes: number;
  omw: number;
  tieKey: string;
}

function headToHead(a: string, b: string, history: HistoryMatch[]): number {
  let balance = 0;
  let played = false;
  for (const match of history) {
    if (!match.player2) continue;
    const involves = (match.player1 === a && match.player2 === b) || (match.player1 === b && match.player2 === a);
    if (!involves) continue;
    played = true;
    const aResult = match.player1 === a ? match.result1 : match.result2;
    if (aResult === 'win') balance += 1;
    else if (aResult === 'loss') balance -= 1;
  }
  if (!played || balance === 0) return 0;
  return balance > 0 ? -1 : 1;
}

export function rankPlayers(playerIds: string[], history: HistoryMatch[]): RankedPlayer[] {
  const records = buildRecords(playerIds, history);
  const ranked = playerIds.map((id) => {
    const record = records.get(id)!;
    const omw = opponentMatchWin(record, records);
    return {
      id,
      points: record.points,
      wins: record.wins,
      losses: record.losses,
      draws: record.draws,
      byes: record.byes,
      omw,
      tieKey: `${record.points}:${omw.toFixed(6)}`,
    };
  });

  const groups = new Map<string, RankedPlayer[]>();
  for (const player of ranked) {
    const group = groups.get(player.tieKey) || [];
    group.push(player);
    groups.set(player.tieKey, group);
  }

  ranked.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.omw !== a.omw) return b.omw - a.omw;
    const group = groups.get(a.tieKey) || [];
    if (group.length === 2 && group.some((player) => player.id === b.id)) {
      return headToHead(a.id, b.id, history);
    }
    return 0;
  });

  return ranked;
}

/** Unresolved ties that touch 1st, 2nd, or 3rd. Head-to-head already ordered a pair of two. */
export function manualTieGroups(ranked: RankedPlayer[], history: HistoryMatch[]): string[][] {
  const groups: string[][] = [];
  let index = 0;
  while (index < ranked.length) {
    let end = index + 1;
    while (
      end < ranked.length &&
      ranked[end].points === ranked[index].points &&
      ranked[end].omw === ranked[index].omw
    ) {
      end += 1;
    }
    const slice = ranked.slice(index, end);
    const touchesPodium = index < 3;
    const alreadySplit = slice.length === 2 && headToHead(slice[0].id, slice[1].id, history) !== 0;
    if (slice.length > 1 && touchesPodium && !alreadySplit) {
      groups.push(slice.map((player) => player.id));
    }
    index = end;
  }
  return groups;
}

export interface ByeCandidate {
  id: string;
  points: number;
  byes: number;
  seat: number | null;
}

export function selectBye(players: ByeCandidate[], random: () => number, sealed: boolean): string | null {
  if (players.length === 0) return null;
  const untouched = players.filter((player) => player.byes === 0);
  const pool = untouched.length > 0 ? untouched : players;
  const lowest = Math.min(...pool.map((player) => player.points));
  let tied = pool.filter((player) => player.points === lowest);
  if (untouched.length === 0 && !sealed) {
    const highestSeat = Math.max(...tied.map((player) => player.seat ?? 0));
    const seated = tied.filter((player) => (player.seat ?? 0) === highestSeat);
    if (seated.length > 0) tied = seated;
  }
  return tied[Math.floor(random() * tied.length)].id;
}

function havePlayed(a: string, b: string, history: HistoryMatch[]) {
  return history.some((match) =>
    (match.player1 === a && match.player2 === b) || (match.player1 === b && match.player2 === a)
  );
}

function searchPairings(open: string[], history: HistoryMatch[], allowRematch: boolean): Pairing[] | null {
  if (open.length === 0) return [];
  const [first, ...rest] = open;
  const candidates = rest.filter((other) => allowRematch || !havePlayed(first, other, history));
  for (const other of candidates) {
    const next = rest.filter((player) => player !== other);
    const tail = searchPairings(next, history, allowRematch);
    if (tail) {
      return [{ player1: first, player2: other, rematch: havePlayed(first, other, history) }, ...tail];
    }
  }
  return null;
}

export function swissPairings(
  players: ByeCandidate[],
  history: HistoryMatch[],
  random: () => number,
  sealed: boolean
): Pairing[] {
  // Dropped players still contribute their real records to opponent strength.
  const recordIds = new Set(players.map((player) => player.id));
  for (const match of history) {
    recordIds.add(match.player1);
    if (match.player2) recordIds.add(match.player2);
  }
  const records = buildRecords([...recordIds], history);
  const scored = players.map((player) => ({
    ...player,
    points: records.get(player.id)?.points || 0,
    byes: records.get(player.id)?.byes || 0,
  }));
  const ordered = [...scored].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const omw = opponentMatchWin(records.get(b.id)!, records) - opponentMatchWin(records.get(a.id)!, records);
    return omw;
  });

  let field = ordered;
  const pairings: Pairing[] = [];
  if (field.length % 2 === 1) {
    const byeId = selectBye(field, random, sealed);
    if (byeId) {
      pairings.push({ player1: byeId, player2: null, rematch: false });
      field = field.filter((player) => player.id !== byeId);
    }
  }

  const ids = field.map((player) => player.id);
  const clean = searchPairings(ids, history, false);
  const paired = clean || searchPairings(ids, history, true) || [];
  return [...pairings, ...paired];
}

export function commanderKey(name: string | null | undefined, partner: string | null | undefined) {
  const first = name?.trim();
  const second = partner?.trim();
  if (first && second) return `${first} & ${second}`;
  return first || 'No commander';
}

export interface StatGame {
  matchId: string;
  profileId: string;
  result: Result | null;
  gameType: string;
  tournament: boolean;
  bye: boolean;
  playedOn: string;
  createdAt: string;
  commander: string | null;
  opponents: string[];
}

export interface Streak {
  current: number;
  best: number;
}

export function streakFor(results: Result[]): Streak {
  let best = 0;
  let run = 0;
  for (const result of results) {
    if (result === 'win') {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  let current = 0;
  for (let index = results.length - 1; index >= 0; index -= 1) {
    if (results[index] !== 'win') break;
    current += 1;
  }
  return { current, best };
}

export function eventStatDays(start: string | null, end: string | null, gameDays: string[]): string[] {
  const days = new Set<string>(gameDays);
  if (start && end && end >= start) {
    for (const day of eachDate(start, end)) days.add(day);
  }
  return [...days].sort();
}

export interface EventStats {
  days: string[];
  commanderByCommander: { name: string; wins: number; losses: number }[];
  teamByPlayer: { profileId: string; wins: number; losses: number }[];
  tournaments: { id: string; players: { profileId: string; points: number; wins: number; losses: number; draws: number; place: number | null }[] }[];
  headToHead: { a: string; b: string; commander: string; tournament: string }[];
  mostCommanderWins: { profileId: string; wins: number } | null;
  mostTournamentWins: { profileId: string; wins: number } | null;
  titles: { profileId: string; count: number } | null;
  mostPlayed: { profileId: string; played: number } | null;
  matchRates: { profileId: string; wins: number; played: number; rate: number }[];
  streaks: { profileId: string; commander: Streak; tournament: Streak }[];
}

function recordPair(wins: number, losses: number) {
  return `${wins}–${losses}`;
}

export function buildEventStats(input: {
  games: StatGame[];
  start: string | null;
  end: string | null;
  profiles: string[];
  tournamentPlaces: { tournamentId: string; profileId: string; place: number | null; points: number; wins: number; losses: number; draws: number }[];
}): EventStats {
  const commanderRows = new Map<string, { wins: number; losses: number }>();
  const teamByPlayer = new Map<string, { wins: number; losses: number }>();
  const commanderWins = new Map<string, number>();
  const tournamentWins = new Map<string, number>();
  const commanderSeries = new Map<string, { at: string; result: Result }[]>();
  const tournamentSeries = new Map<string, { at: string; result: Result }[]>();
  const h2h = new Map<string, { cw: number; cl: number; tw: number; tl: number }>();

  const bump = (map: Map<string, number>, id: string) => map.set(id, (map.get(id) || 0) + 1);

  for (const game of input.games) {
    if (!game.result) continue;
    const at = `${game.playedOn}T${game.createdAt}`;
    if (game.tournament) {
      const result: Result = game.bye ? 'win' : game.result;
      const series = tournamentSeries.get(game.profileId) || [];
      series.push({ at, result });
      tournamentSeries.set(game.profileId, series);
      if (result === 'win') bump(tournamentWins, game.profileId);
    } else if (isCommanderFormat(game.gameType)) {
      if (game.result !== 'draw') {
        const key = game.commander || 'No commander';
        const row = commanderRows.get(key) || { wins: 0, losses: 0 };
        if (game.result === 'win') row.wins += 1;
        else row.losses += 1;
        commanderRows.set(key, row);
        if (game.result === 'win') bump(commanderWins, game.profileId);
      }
      const series = commanderSeries.get(game.profileId) || [];
      series.push({ at, result: game.result });
      commanderSeries.set(game.profileId, series);
    }
    if (!game.tournament && isTeamFormat(game.gameType) && game.result !== 'draw') {
      const row = teamByPlayer.get(game.profileId) || { wins: 0, losses: 0 };
      if (game.result === 'win') row.wins += 1;
      else row.losses += 1;
      teamByPlayer.set(game.profileId, row);
    }

    if (game.result !== 'win' || game.bye) continue;
    for (const opponent of game.opponents) {
      if (opponent === game.profileId) continue;
      const opponentResult = input.games.find((other) => other.matchId === game.matchId && other.profileId === opponent)?.result;
      if (opponentResult !== 'loss') continue;
      const [a, b] = [game.profileId, opponent].sort();
      const key = `${a}|${b}`;
      const row = h2h.get(key) || { cw: 0, cl: 0, tw: 0, tl: 0 };
      const leftWon = game.profileId === a;
      if (game.tournament) {
        if (leftWon) row.tw += 1;
        else row.tl += 1;
      } else if (isCommanderFormat(game.gameType)) {
        if (leftWon) row.cw += 1;
        else row.cl += 1;
      } else {
        continue;
      }
      h2h.set(key, row);
    }
  }

  const top = (map: Map<string, number>) => {
    let best: { profileId: string; wins: number } | null = null;
    for (const [profileId, wins] of map) {
      if (!best || wins > best.wins) best = { profileId, wins };
    }
    return best && best.wins > 0 ? best : null;
  };

  const played = new Map<string, { wins: number; played: number }>();
  for (const game of input.games) {
    if (!game.result) continue;
    const row = played.get(game.profileId) || { wins: 0, played: 0 };
    row.played += 1;
    if (game.result === 'win' || game.bye) row.wins += 1;
    played.set(game.profileId, row);
  }
  const rates = [...played.entries()].map(([profileId, row]) => ({
    profileId,
    wins: row.wins,
    played: row.played,
    rate: row.played === 0 ? 0 : row.wins / row.played,
  })).sort((a, b) => b.rate - a.rate || b.played - a.played);
  const playedCounts = new Map([...played.entries()].map(([id, row]) => [id, row.played]));

  const streaks = input.profiles.map((profileId) => {
    const commander = (commanderSeries.get(profileId) || []).sort((a, b) => a.at.localeCompare(b.at)).map((row) => row.result);
    const tournament = (tournamentSeries.get(profileId) || []).sort((a, b) => a.at.localeCompare(b.at)).map((row) => row.result);
    return { profileId, commander: streakFor(commander), tournament: streakFor(tournament) };
  });

  const tournaments = new Map<string, EventStats['tournaments'][number]['players']>();
  for (const row of input.tournamentPlaces) {
    const players = tournaments.get(row.tournamentId) || [];
    players.push({
      profileId: row.profileId,
      points: row.points,
      wins: row.wins,
      losses: row.losses,
      draws: row.draws,
      place: row.place,
    });
    tournaments.set(row.tournamentId, players);
  }

  return {
    days: eventStatDays(input.start, input.end, input.games.map((game) => game.playedOn)),
    commanderByCommander: [...commanderRows.entries()]
      .map(([name, row]) => ({ name, ...row }))
      .sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name)),
    teamByPlayer: [...teamByPlayer.entries()].map(([profileId, row]) => ({ profileId, ...row })),
    tournaments: [...tournaments.entries()].map(([id, players]) => ({ id, players })),
    headToHead: [...h2h.entries()].map(([key, row]) => {
      const [a, b] = key.split('|');
      return {
        a,
        b,
        commander: recordPair(row.cw, row.cl),
        tournament: recordPair(row.tw, row.tl),
      };
    }),
    mostCommanderWins: top(commanderWins),
    mostTournamentWins: top(tournamentWins),
    titles: titleLeader(input.tournamentPlaces),
    mostPlayed: mostPlayed(playedCounts),
    matchRates: rates,
    streaks,
  };
}

function titleLeader(places: { profileId: string; place: number | null }[]) {
  const counts = new Map<string, number>();
  for (const row of places) {
    if (row.place === 1) counts.set(row.profileId, (counts.get(row.profileId) || 0) + 1);
  }
  let best: { profileId: string; count: number } | null = null;
  for (const [profileId, count] of counts) {
    if (!best || count > best.count) best = { profileId, count };
  }
  return best;
}

function mostPlayed(played: Map<string, number>) {
  let best: { profileId: string; played: number } | null = null;
  for (const [profileId, count] of played) {
    if (!best || count > best.played) best = { profileId, played: count };
  }
  return best && best.played > 0 ? best : null;
}

export function placeLabel(place: number) {
  if (place === 1) return '1st';
  if (place === 2) return '2nd';
  if (place === 3) return '3rd';
  return `${place}th`;
}
