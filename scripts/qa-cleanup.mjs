// Opt-in cleanup for an explicitly disposable QA event. Default mode only prints a manifest.
// node scripts/qa-cleanup.mjs <event-uuid> [--delete]
// Uses normal authenticated house policies, never a service-role key.
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
const args = process.argv.slice(2);
const eventId = args.find(arg => !arg.startsWith('--'));
assert.match(eventId || '', /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i, 'Supply one explicit event UUID.');
assert.ok(args.every(arg => arg === eventId || arg === '--delete') && args.filter(arg => arg === eventId).length === 1, 'Usage: node scripts/qa-cleanup.mjs <event-uuid> [--delete]');
const deleting = args.includes('--delete');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
must(await db.auth.signInAnonymously());
must(await db.rpc('assume_house'));
assert.equal(must(await db.rpc('current_player_context')).mode, 'house');
const event = must(await db.from('events').select('id,name').eq('id', eventId).single());
assert.ok(event.name.startsWith('QA Disposable'), 'Refusing cleanup: event name must start with QA Disposable.');
const tournaments = must(await db.from('tournaments').select('id,name').eq('event_id', eventId));
assert.ok(tournaments.every(t => /^QA(?:\s|[—:-])/.test(t.name)), 'Refusing cleanup: every tournament must be QA-prefixed.');
const tournamentIds = tournaments.map(t => t.id);
const matches = must(await db.from('matches').select('id,tournament_id,event_id,round_number,started_at,completed_at').eq('event_id', eventId));
assert.ok(matches.every(m => m.event_id === eventId && (!m.tournament_id || tournamentIds.includes(m.tournament_id))), 'Refusing cross-event tournament match.');
if (tournamentIds.length) {
  const linked = must(await db.from('matches').select('id,event_id').in('tournament_id', tournamentIds));
  assert.ok(linked.every(m => m.event_id === eventId), 'Refusing tournament containing matches from another event.');
}
const matchIds = matches.map(m => m.id);
const matchParticipants = matchIds.length ? must(await db.from('match_participants').select('id,match_id').in('match_id', matchIds)) : [];
const participants = tournamentIds.length ? must(await db.from('tournament_participants').select('id,tournament_id').in('tournament_id', tournamentIds)) : [];
if (participants.length) {
  const linked = must(await db.from('match_participants').select('id,match_id').in('participant_id', participants.map(p => p.id)));
  assert.ok(linked.every(p => matchIds.includes(p.match_id)), 'Refusing participant linked to another event match.');
}
const prizes = must(await db.from('event_prizes').select('id,event_id,tournament_id').eq('event_id', eventId));
const eventDecks = must(await db.from('event_decks').select('id,event_id,tournament_id,photo_paths').eq('event_id', eventId));
assert.ok(prizes.every(p => !p.tournament_id || tournamentIds.includes(p.tournament_id)), 'Refusing cross-event prize.');
assert.ok(eventDecks.every(p => !p.tournament_id || tournamentIds.includes(p.tournament_id)), 'Refusing cross-event event deck.');
assert.ok(eventDecks.every(p => !(p.photo_paths || []).length), 'Refusing automatic cleanup of event decks with uploaded photos.');
if (tournamentIds.length) {
  for (const table of ['event_prizes', 'event_decks']) {
    const linked = must(await db.from(table).select('id,event_id').in('tournament_id', tournamentIds));
    assert.ok(linked.every(row => row.event_id === eventId), `Refusing cross-event ${table} dependency.`);
  }
}
const eventDeckCards = eventDecks.length ? must(await db.from('event_deck_cards').select('id,event_deck_id').in('event_deck_id', eventDecks.map(d => d.id))) : [];
const members = must(await db.from('event_members').select('profile_id').eq('event_id', eventId));
const manifest = {
  mode: deleting ? 'DELETE' : 'DRY RUN — no event data will be deleted',
  event,
  tournaments,
  counts: { match_participants: matchParticipants.length, matches: matches.length, quick_matches: matches.filter(m => !m.tournament_id).length, tournament_participants: participants.length, event_prizes: prizes.length, event_decks: eventDecks.length, event_deck_cards_cascade: eventDeckCards.length, tournaments: tournaments.length, event_members: members.length, events: 1 },
  matchIds,
  protected: 'Profiles, saved decks, auth users, and other events are never deleted.',
};
console.log(JSON.stringify(manifest, null, 2));
if (!deleting) process.exit(0);

// Non-transactional API calls: abort immediately on any error or row-count mismatch.
// Every delete uses IDs captured above plus its event or captured-parent constraint.
async function remove(table, rows, scope) {
  if (!rows.length) return;
  let query = db.from(table).delete().in('id', rows.map(row => row.id));
  query = scope(query);
  const removed = must(await query.select('id'));
  assert.equal(removed.length, rows.length, `${table}: deletion blocked or changed concurrently. Stop and inspect policies/state.`);
  console.log(`Deleted ${removed.length} ${table} rows.`);
}
await remove('match_participants', matchParticipants, q => q.in('match_id', matchIds));
await remove('matches', matches, q => q.eq('event_id', eventId));
await remove('tournament_participants', participants, q => q.in('tournament_id', tournamentIds));
await remove('event_prizes', prizes, q => q.eq('event_id', eventId));
await remove('event_decks', eventDecks, q => q.eq('event_id', eventId));
// Check parent scopes again: never cascade unexpected data created after the manifest.
for (const table of ['matches', 'event_prizes', 'event_decks']) {
  assert.equal(must(await db.from(table).select('id').eq('event_id', eventId)).length, 0, `${table} changed concurrently; stop cleanup.`);
}
if (tournamentIds.length) assert.equal(must(await db.from('tournament_participants').select('id').in('tournament_id', tournamentIds)).length, 0);
await remove('tournaments', tournaments, q => q.eq('event_id', eventId));
if (members.length) {
  const removed = must(await db.from('event_members').delete().eq('event_id', eventId).in('profile_id', members.map(m => m.profile_id)).select('profile_id'));
  assert.equal(removed.length, members.length, 'Event member deletion blocked or changed concurrently.');
  console.log(`Deleted ${removed.length} event_members rows.`);
}
assert.equal(must(await db.from('tournaments').select('id').eq('event_id', eventId)).length, 0);
assert.equal(must(await db.from('event_members').select('profile_id').eq('event_id', eventId)).length, 0);
const current = must(await db.from('events').select('id,name').eq('id', eventId).single());
assert.equal(current.name, event.name, 'Event renamed during cleanup.');
const removedEvent = must(await db.from('events').delete().eq('id', eventId).eq('name', event.name).select('id'));
assert.equal(removedEvent.length, 1, 'Event deletion blocked by policy.');
assert.equal(must(await db.from('events').select('id').eq('id', eventId)).length, 0);
console.log(`Cleaned disposable event ${eventId}. No profiles, saved decks or auth users were deleted.`);
