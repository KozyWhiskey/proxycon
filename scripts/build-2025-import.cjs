const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '.2025results');
function parseCsv(file) {
  const text = fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 1; }
        else quoted = false;
      } else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (char !== '\r') cell += char;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  const [header, ...body] = rows.filter((line) => line.some((value) => value !== ''));
  return body.map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ''])));
}

const players = parseCsv('players_rows.csv');
const tournaments = parseCsv('tournaments_rows.csv');
const matches = parseCsv('matches_rows.csv');
const seats = parseCsv('match_participants_rows.csv');
const roster = parseCsv('tournament_participants_rows.csv');

const existing = {
  craig: '1a899a68-97e1-4e84-8257-32a8aed35611',
  michael: '30a345e4-1253-4506-a998-e69a5654cb57',
  sid: '425e12af-30ae-482d-86fe-2de2929ae3df',
  'chris p': 'e46612a2-1028-4806-a544-3354260fec9b',
  mark: 'c8bf9f2e-ae9b-44b7-9791-79d424996545',
  chris: '2ced67cd-2d75-4100-87a9-7622dae5d5e9',
  rohan: '839fee3f-e76d-43a4-9b84-d5ace36ba473',
};
const created = {
  konrad: '7c0a1d10-6b14-4a0e-9b1a-0a6d5c3e1001',
  ryan: '7c0a1d10-6b14-4a0e-9b1a-0a6d5c3e1002',
  peter: '7c0a1d10-6b14-4a0e-9b1a-0a6d5c3e1003',
  denny: '7c0a1d10-6b14-4a0e-9b1a-0a6d5c3e1004',
};
function norm(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}
const byOldId = new Map();
for (const player of players) {
  const key = norm(player.name);
  const id = existing[key] || created[key];
  if (!id) throw new Error('No profile mapping for ' + player.name);
  byOldId.set(player.id, { id, name: player.name.trim(), color: player.color || null, created: Boolean(created[key]) });
}

const formats = {
  'Mystery Booster': { format: 'set_draft', source: 'set' },
  Spiderman: { format: 'set_draft', source: 'set' },
  'Murders at Karlov Sealed': { format: 'sealed', source: 'set' },
  'Chaos Draft': { format: 'chaos_draft', source: 'sets' },
  'Theros Draft': { format: 'set_draft', source: 'set' },
  'Vintage Cube': { format: 'cube', source: 'cube' },
};

function sqlText(value) {
  if (value == null || value === '') return 'null';
  return "'" + String(value).replace(/'/g, "''") + "'";
}
function parseStamp(value) {
  let iso = value.trim().replace(' ', 'T');
  iso = iso.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  iso = iso.replace(/([+-]\d{2})$/, '$1:00');
  if (!/[zZ]|[+-]\d{2}:\d{2}$/.test(iso)) iso += 'Z';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new Error('Bad timestamp ' + value);
  return date;
}
function chicagoDate(value) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(parseStamp(value));
}
function sqlTime(value) {
  if (!value) return 'null';
  return sqlText(parseStamp(value).toISOString());
}

const eventId = 'b7c5a202-2025-4e17-9c25-000000002025';
const craig = existing.craig;
const removed = [
  'cd87e757-9a9e-4545-911d-62ec70f9315e',
  'ac6a7d97-ebfc-498a-991a-0ddcbd64125f',
  '171e146f-734f-45c3-93cc-dc8e71d77dcb',
  '7890d6a8-da76-4ef5-b7af-e46302ecb5ab',
  '7aa67a90-101a-49fc-a035-02982ce42e09',
  '335211f3-ae0e-4bef-b7a0-fcabb861fed9',
  '7224e160-574b-49fc-ad63-df92d95fabdd',
  '20292efa-284b-4985-8361-f9b5b3b9284d',
  'ad1b038a-c439-4ee3-ad4a-47521efa0ae3',
  '27b69fcf-aa55-452b-9e38-2ac8522ea69b',
  'b52b6e08-8078-4716-9c89-27a60388585d',
  '26bfa5f8-8229-422d-9795-61917d6e6d34',
];
const removedList = removed.map((id) => sqlText(id)).join(', ');
const lines = [];
lines.push('-- ProxyCon 2025 results. Source files in .2025results are not modified.');
lines.push('-- Removes accounts that were not in the 2025 roster and do not own the kept decks.');
lines.push(`update public.events set owner_id = ${sqlText(existing.craig)} where owner_id in (${removedList});`);
lines.push(`update public.event_prizes set brought_by = null where brought_by in (${removedList});`);
lines.push(`update public.event_prizes set awarded_to = null where awarded_to in (${removedList});`);
lines.push(`update public.tournaments set brought_by = null where brought_by in (${removedList});`);
lines.push(`update public.organization_members set invited_by = null where invited_by in (${removedList});`);
lines.push(`delete from public.profiles where id in (${removedList});`);
lines.push('');
lines.push('insert into public.profiles (id, display_name, role, selectable, auth_user_id)');
lines.push('values');
lines.push([...byOldId.values()].filter((player) => player.created).map((player) => `  (${sqlText(player.id)}, ${sqlText(player.name)}, 'user', true, null)`).join(',\n'));
lines.push('on conflict (id) do nothing;');
lines.push('');
for (const player of byOldId.values()) {
  if (player.color) lines.push(`update public.profiles set color = ${sqlText(player.color)} where id = ${sqlText(player.id)};`);
}
lines.push(`update public.profiles set display_name = 'Sid' where id = ${sqlText(existing.sid)};`);
lines.push(`update public.profiles set display_name = 'Chris P' where id = ${sqlText(existing['chris p'])};`);
lines.push('');
lines.push(`insert into public.events (id, owner_id, name, start_date, end_date, is_active, invite_code)`);
lines.push(`values (${sqlText(eventId)}, ${sqlText(craig)}, 'ProxyCon 2025', '2025-12-11', '2025-12-14', false, 'PCON25')`);
lines.push('on conflict (id) do nothing;');
lines.push('insert into public.event_members (event_id, profile_id, role) values');
const memberIds = [...new Set([...byOldId.values()].map((player) => player.id))];
lines.push(memberIds.map((id) => `  (${sqlText(eventId)}, ${sqlText(id)}, ${id === craig ? "'owner'" : "'player'"})`).join(',\n'));
lines.push('on conflict (event_id, profile_id) do nothing;');
lines.push('');

lines.push('insert into public.tournaments (id, event_id, name, format, status, max_rounds, round_duration_minutes, prize_1st, prize_2nd, prize_3rd, prizes_enabled, card_source, field_locked, pod_count, starts_on, is_archived) values');
lines.push(tournaments.map((tournament) => {
  const shape = formats[tournament.name];
  if (!shape) throw new Error('Unknown tournament ' + tournament.name);
  const prizes = [tournament.prize_1st, tournament.prize_2nd, tournament.prize_3rd].some(Boolean);
  return `  (${sqlText(tournament.id)}, ${sqlText(eventId)}, ${sqlText(tournament.name)}, ${sqlText(shape.format)}, 'completed', ${Number(tournament.max_rounds) || 3}, ${Number(tournament.round_duration_minutes) || 50}, ${sqlText(tournament.prize_1st)}, ${sqlText(tournament.prize_2nd)}, ${sqlText(tournament.prize_3rd)}, ${prizes}, ${sqlText(shape.source)}, true, 1, ${sqlText(chicagoDate(tournament.created_at))}, false)`;
}).join(',\n') + ' on conflict (id) do nothing;');
lines.push('');

const seenSeats = new Set();
for (const seat of roster) {
  if (!seat.draft_seat) continue;
  const key = seat.tournament_id + ':' + seat.draft_seat;
  if (seenSeats.has(key)) seat.draft_seat = '';
  else seenSeats.add(key);
}
const participantId = new Map();
lines.push('insert into public.tournament_participants (id, tournament_id, profile_id, draft_seat, dropped, pod) values');
lines.push(roster.map((seat, index) => {
  const player = byOldId.get(seat.player_id);
  if (!player) throw new Error('Roster player missing ' + seat.player_id);
  const id = seat.id;
  participantId.set(seat.tournament_id + ':' + seat.player_id, id);
  return `  (${sqlText(id)}, ${sqlText(seat.tournament_id)}, ${sqlText(player.id)}, ${seat.draft_seat ? Number(seat.draft_seat) : 'null'}, false, 1)`;
}).join(',\n') + ' on conflict (id) do nothing;');
lines.push('');

const seatsByMatch = new Map();
for (const seat of seats) {
  const list = seatsByMatch.get(seat.match_id) || [];
  list.push(seat);
  seatsByMatch.set(seat.match_id, list);
}
const tables = new Map();
const ordered = [...matches].sort((a, b) => a.created_at.localeCompare(b.created_at));
for (const match of ordered) {
  if (!match.tournament_id) continue;
  const key = match.tournament_id + ':' + match.round_number;
  const next = (tables.get(key) || 0) + 1;
  tables.set(key, next);
  match.table = next;
}

lines.push('insert into public.matches (id, event_id, tournament_id, round_number, table_number, table_label, game_type, format_label, started_at, completed_at, played_on, created_at) values');
lines.push(ordered.map((match) => {
  const tournament = tournaments.find((item) => item.id === match.tournament_id);
  const shape = tournament ? formats[tournament.name] : null;
  const gameType = shape ? shape.format : 'commander';
  const label = tournament ? tournament.name : 'Commander';
  const played = chicagoDate(match.created_at);
  const matchSeats = seatsByMatch.get(match.id) || [];
  const finished = matchSeats.length > 0 && matchSeats.every((seat) => seat.result);
  const startedRaw = match.started_at || (finished ? match.created_at : '');
  let completedRaw = finished ? matchSeats.map((seat) => seat.updated_at).sort().at(-1) : '';
  if (finished && startedRaw && completedRaw && parseStamp(completedRaw) < parseStamp(startedRaw)) completedRaw = startedRaw;
  const completed = finished ? sqlTime(completedRaw) : 'null';
  const started = sqlTime(startedRaw);
  return `  (${sqlText(match.id)}, ${sqlText(eventId)}, ${sqlText(match.tournament_id)}, ${match.round_number ? Number(match.round_number) : 'null'}, ${match.table || 'null'}, ${sqlText(match.table ? 'Table ' + match.table : label)}, ${sqlText(gameType)}, ${sqlText(label)}, ${started}, ${completed}, ${sqlText(played)}, ${sqlTime(match.created_at)})`;
}).join(',\n') + ' on conflict (id) do nothing;');
lines.push('');

lines.push('insert into public.match_participants (id, match_id, profile_id, participant_id, result, games_won) values');
lines.push(seats.map((seat) => {
  const player = byOldId.get(seat.player_id);
  if (!player) throw new Error('Seat player missing ' + seat.player_id);
  const match = matches.find((item) => item.id === seat.match_id);
  const participant = match?.tournament_id ? participantId.get(match.tournament_id + ':' + seat.player_id) : null;
  const games = seat.games_won === '' ? 'null' : Number(seat.games_won);
  return `  (${sqlText(seat.id)}, ${sqlText(seat.match_id)}, ${sqlText(player.id)}, ${sqlText(participant || '')}, ${sqlText(seat.result)}, ${games})`;
}).join(',\n') + ' on conflict (id) do nothing;');
lines.push('');

function pointsFor(result) {
  if (result === 'win') return 3;
  if (result === 'draw') return 1;
  return 0;
}
function historyFor(tournamentId) {
  const history = [];
  for (const match of matches.filter((item) => item.tournament_id === tournamentId)) {
    const recorded = (seatsByMatch.get(match.id) || [])
      .filter((seat) => seat.result)
      .map((seat) => ({
        participant: participantId.get(tournamentId + ':' + seat.player_id),
        result: seat.result,
      }))
      .filter((seat) => seat.participant);
    if (recorded.length === 1) history.push({ player1: recorded[0].participant, player2: null, result1: 'win', result2: null });
    else if (recorded.length >= 2) history.push({ player1: recorded[0].participant, player2: recorded[1].participant, result1: recorded[0].result, result2: recorded[1].result });
  }
  return history;
}
function headToHead(a, b, history) {
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
function rankTournament(tournamentId) {
  const people = roster.filter((seat) => seat.tournament_id === tournamentId).map((seat) => seat.id);
  const history = historyFor(tournamentId);
  const records = new Map(people.map((id) => [id, { points: 0, wins: 0, losses: 0, draws: 0, byes: 0, nonByePoints: 0, nonByeMatches: 0, opponents: [] }]));
  const add = (id, result) => {
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
  const percent = (record) => record.nonByeMatches === 0 ? 0 : record.nonByePoints / (record.nonByeMatches * 3);
  const omw = (record) => {
    let sum = 0;
    let count = 0;
    for (const opponentId of record.opponents) {
      const opponent = records.get(opponentId);
      if (!opponent || opponent.nonByeMatches === 0) continue;
      sum += percent(opponent);
      count += 1;
    }
    return count === 0 ? 0 : sum / count;
  };
  const ranked = people.map((id) => {
    const record = records.get(id);
    const rate = omw(record);
    return { id, points: record.points, omw: rate, tieKey: record.points + ':' + rate.toFixed(6) };
  });
  const groups = new Map();
  for (const player of ranked) {
    const group = groups.get(player.tieKey) || [];
    group.push(player);
    groups.set(player.tieKey, group);
  }
  ranked.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.omw !== a.omw) return b.omw - a.omw;
    const group = groups.get(a.tieKey) || [];
    if (group.length === 2 && group.some((player) => player.id === b.id)) return headToHead(a.id, b.id, history);
    return 0;
  });
  const places = [];
  let index = 0;
  while (index < ranked.length) {
    let end = index + 1;
    while (end < ranked.length && ranked[end].tieKey === ranked[index].tieKey) end += 1;
    const group = ranked.slice(index, end);
    const broken = group.length === 2 && headToHead(group[0].id, group[1].id, history) !== 0;
    if (broken) {
      places.push({ id: group[0].id, place: index + 1 });
      places.push({ id: group[1].id, place: index + 2 });
    } else {
      for (const player of group) places.push({ id: player.id, place: index + 1 });
    }
    index = end;
  }
  return places;
}

lines.push('-- Places follow match points, opponent win rate, then head-to-head. Unbroken ties share a place.');
for (const tournament of tournaments) {
  for (const standing of rankTournament(tournament.id)) {
    lines.push(`update public.tournament_participants set place = ${standing.place} where id = ${sqlText(standing.id)};`);
  }
}
lines.push('');

const out = path.join(__dirname, 'sql', 'import_proxycon_2025.sql');
fs.writeFileSync(out, lines.join('\n'));
const dates = ordered.map((match) => chicagoDate(match.created_at)).sort();
console.log(JSON.stringify({
  players: players.length,
  created: Object.keys(created),
  tournaments: tournaments.length,
  matches: matches.length,
  seats: seats.length,
  roster: roster.length,
  firstDay: dates[0],
  lastDay: dates.at(-1),
  bytes: fs.statSync(out).size,
}, null, 2));
