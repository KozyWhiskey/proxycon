import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const admin = '10000000-0000-4000-8000-000000000001';
const existing = '20000000-0000-4000-8000-000000000002';
const guest = '30000000-0000-4000-8000-000000000003';
const otherGuest = '40000000-0000-4000-8000-000000000004';
const event = '50000000-0000-4000-8000-000000000005';
const token = 'a'.repeat(64);
const hash = value => createHash('sha256').update(value).digest('hex');
await db.exec(`
 create role anon; create role authenticated;
 create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb$$;
 grant usage on schema public, auth to anon, authenticated;
 grant execute on all functions in schema auth to anon, authenticated;
 create table auth.users (id uuid primary key, is_anonymous boolean not null default false);
 create table public.profiles (id uuid primary key references auth.users(id), username text unique, display_name text, role text not null default 'user');
 create table public.decks (id uuid primary key default gen_random_uuid(), owner_id uuid references profiles(id), name text);
 create table public.events (id uuid primary key, name text, is_active boolean not null default true);
 create table public.event_members (event_id uuid references events(id), profile_id uuid references profiles(id), role text, primary key (event_id,profile_id));
 insert into auth.users(id) values ('${admin}'),('${existing}'),('${guest}'),('${otherGuest}');
 update auth.users set is_anonymous=true where id in ('${guest}','${otherGuest}');
 insert into profiles values ('${admin}','craig','Craig','admin'),('${existing}','scott','Scott','user');
 insert into decks(owner_id,name) values ('${admin}','Skullbriar'),('${existing}','Saved commander deck');
 insert into events values ('${event}','Weekend',true);
 -- Deliberately broad legacy policies must not defeat the new ownership guards.
 alter table profiles enable row level security; alter table decks enable row level security;
 create policy legacy_all on profiles for all to authenticated using (true) with check (true);
 create policy legacy_all on decks for all to authenticated using (true) with check (true);
`);
const before = (await db.query('select * from profiles order by id')).rows;
const decksBefore = (await db.query('select * from decks order by id')).rows;
const migration = await readFile(new URL('./sql/weekend_guest_accounts.sql', import.meta.url), 'utf8');
await db.exec(migration);
await db.exec(migration); // Safe to reapply without losing accounts or decks.
assert.deepEqual((await db.query('select * from profiles order by id')).rows, before);
assert.deepEqual((await db.query('select * from decks order by id')).rows, decksBefore);

async function session(id, anonymous = false, role = 'authenticated') {
 await db.exec('reset role');
 await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id || '']);
 await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ is_anonymous: anonymous })]);
 await db.exec('set role ' + role);
}
async function fails(sql, args, pattern) {
 await assert.rejects(() => db.query(sql,args), pattern);
}
await session(existing);
await fails('select create_weekend_guest_invitation($1,$2)',[event,hash(token)],/Administrator/);
await fails("update profiles set role='admin' where id=$1",[existing],/administrator/);
assert.equal((await db.query('update decks set name=$1 where owner_id=$2 returning id',['Stolen',admin])).rows.length,0);

await session(admin);
const invitation = (await db.query('select create_weekend_guest_invitation($1,$2) as id',[event,hash(token)])).rows[0].id;
const spot = (await db.query("select add_weekend_guest_spot($1,'Scott weekend') as id",[invitation])).rows[0].id;
const secondSpot = (await db.query("select add_weekend_guest_spot($1,'Taylor') as id",[invitation])).rows[0].id;
await fails("select add_weekend_guest_spot($1,'  SCOTT WEEKEND  ')",[invitation],/already has/);

await session(null,false,'anon');
await fails('select * from profiles',[],/permission denied/);
await fails('select * from decks',[],/permission denied/);
await fails('select * from weekend_guest_invitations',[],/permission denied/);
assert.equal((await db.query('select read_weekend_guest_invitation($1) as data',['b'.repeat(64)])).rows[0].data,null);
const listing = (await db.query('select read_weekend_guest_invitation($1) as data',[token])).rows[0].data;
assert.equal(listing.eventName,'Weekend');
assert.equal(listing.spots.length,2);
assert.equal(JSON.stringify(listing).includes('token_hash'),false);
assert.equal(JSON.stringify(listing).includes(admin),false);

await session(existing);
await fails('select claim_weekend_guest_spot($1,$2)',[token,spot],/weekend phone session/);
await session(guest,true);
assert.equal((await db.query('select current_weekend_guest_spot() as id')).rows[0].id,null);
assert.equal((await db.query('select claim_weekend_guest_spot($1,$2) as id',[token,spot])).rows[0].id,event);
assert.equal((await db.query('select display_name from profiles where id=$1',[guest])).rows[0].display_name,'Scott weekend');
assert.equal((await db.query('select claim_weekend_guest_spot($1,$2) as id',[token,spot])).rows[0].id,event); // Idempotent retry.
assert.equal((await db.query('select current_weekend_guest_spot() as id')).rows[0].id,spot);
await fails('select claim_weekend_guest_spot($1,$2)',[token,secondSpot],/already has a player/);
await fails('select create_weekend_guest_invitation($1,$2)',[event,hash(token)],/Administrator/);
await fails("update profiles set role='admin' where id=$1",[guest],/administrator/);
assert.equal((await db.query('update profiles set display_name=$1 where id=$2 returning id',['Not Scott',existing])).rows.length,0);
await db.query('insert into decks(owner_id,name) values($1,$2)',[guest,'Guest deck']);
assert.equal((await db.query('select name from decks where owner_id=$1',[guest])).rows[0].name,'Guest deck');

await session(otherGuest,true);
await fails('select claim_weekend_guest_spot($1,$2)',[token,spot],/already claimed/);
assert.equal((await db.query('select * from weekend_guest_spots')).rows.length,0);
await session(admin);
await fails("update profiles set role='admin' where id=$1",[guest],/Weekend guests/);
const replacement = 'c'.repeat(64);
assert.equal((await db.query('select create_weekend_guest_invitation($1,$2) as id',[event,hash(replacement)])).rows[0].id,invitation);
await session(otherGuest,true);
assert.equal((await db.query('select read_weekend_guest_invitation($1) as data',[token])).rows[0].data,null);
await fails('select claim_weekend_guest_spot($1,$2)',[token,secondSpot],/unavailable/);
await db.exec('reset role');
await db.query("update weekend_guest_invitations set expires_at=now()-interval '1 second' where id=$1",[invitation]);
await session(otherGuest,true);
await fails('select claim_weekend_guest_spot($1,$2)',[replacement,secondSpot],/unavailable/);
assert.equal((await db.query('select read_weekend_guest_invitation($1) as data',[replacement])).rows[0].data,null);
await db.exec('reset role');
assert.equal((await db.query('select count(*)::int as n from event_members where event_id=$1 and profile_id=$2',[event,guest])).rows[0].n,1);
assert.deepEqual((await db.query('select * from profiles where id in ($1,$2) order by id',[admin,existing])).rows,before);
assert.deepEqual((await db.query('select * from decks where owner_id in ($1,$2) order by id',[admin,existing])).rows,decksBefore);
// An existing signup-trigger profile must be reused, with atomic rollback on a failed membership.
await session(admin);
await db.query('select create_weekend_guest_invitation($1,$2)',[event,hash(replacement)]);
await db.exec('reset role');
await db.query('insert into profiles values($1,$2,$3,$4)',[otherGuest,'signup_guest','Anonymous','user']);
await session(guest,true);
assert.equal((await db.query('select * from profiles where id=$1',[otherGuest])).rows.length,0);
await db.exec('reset role');
await db.exec(`alter table event_members add constraint fail_membership_test check (profile_id <> '${otherGuest}')`);
await session(otherGuest,true);
await fails('select claim_weekend_guest_spot($1,$2)',[replacement,secondSpot],/fail_membership_test/);
assert.equal((await db.query('select current_weekend_guest_spot() as id')).rows[0].id,null);
assert.equal((await db.query('select display_name from profiles where id=$1',[otherGuest])).rows[0].display_name,'Anonymous');
await db.exec('reset role');
await db.exec('alter table event_members drop constraint fail_membership_test');
await session(otherGuest,true);
await db.query('select claim_weekend_guest_spot($1,$2)',[replacement,secondSpot]);
assert.equal((await db.query('select display_name from profiles where id=$1',[otherGuest])).rows[0].display_name,'Taylor');
assert.equal((await db.query('select username from profiles where id=$1',[otherGuest])).rows[0].username,'signup_guest');
await db.exec('reset role');
await db.query('delete from weekend_guest_invitations where id=$1',[invitation]);
await session(guest,true);
assert.equal((await db.query('select current_weekend_guest_spot() as id')).rows[0].id,spot);
assert.equal((await db.query('select name from decks where owner_id=$1',[guest])).rows[0].name,'Guest deck');
await db.close();
console.log('Guest database tests passed: preservation, permissions, claims, retries, conflicting claims, link rotation, expiry, atomic rollback and durable guest identity.');
