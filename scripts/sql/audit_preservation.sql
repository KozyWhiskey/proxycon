-- Supabase preservation audit. READ ONLY.
-- Run in the Supabase SQL Editor as an administrator.
-- Contains only SELECT statements. No emails, password hashes, or tokens are selected.
-- These queries were prepared locally; they were NOT run by the REST-based review.

-- 1. Verify auth/profile linkage and sign-in providers.
with providers as (
  select user_id, array_agg(distinct provider order by provider) as providers
  from auth.identities
  group by user_id
)
select
  coalesce(p.id, u.id) as id,
  p.username,
  p.display_name,
  p.role,
  (p.id is not null) as has_profile,
  (u.id is not null) as has_auth_user,
  u.created_at as auth_created_at,
  u.last_sign_in_at,
  providers.providers
from public.profiles p
full outer join auth.users u on u.id = p.id
left join providers on providers.user_id = u.id
order by p.display_name nulls last;

-- 2. Actual RLS state for public application tables.
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p')
order by c.relname;

-- 3. Actual policies, including grants that permit more than the UI.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

select table_name, column_name, grantee, privilege_type
from information_schema.column_privileges
where table_schema = 'public'
  and table_name in ('profiles', 'decks')
  and grantee in ('anon', 'authenticated')
order by table_name, column_name, grantee, privilege_type;

-- 4. Constraints and indexes: the select checks cannot verify these.
select c.conrelid::regclass as table_name, c.conname, c.contype,
       pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_namespace n on n.oid = c.connamespace
where n.nspname = 'public'
order by c.conrelid::regclass::text, c.conname;

select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- 5. Profile/auth triggers, particularly any protecting profiles.role.
select event_object_schema, event_object_table, trigger_name,
       action_timing, event_manipulation, action_statement
from information_schema.triggers
where event_object_schema in ('public', 'auth')
order by event_object_schema, event_object_table, trigger_name;

-- 6. Candidate historical links. candidate_count must equal 1.
select mp.id as match_participant_id, m.tournament_id, mp.profile_id,
       count(tp.id) as candidate_count,
       array_agg(tp.id) filter (where tp.id is not null) as candidate_ids
from public.match_participants mp
join public.matches m on m.id = mp.match_id
left join public.tournament_participants tp
  on tp.tournament_id = m.tournament_id and tp.profile_id = mp.profile_id
where m.tournament_id is not null and mp.participant_id is null
group by mp.id, m.tournament_id, mp.profile_id
order by m.tournament_id, mp.id;

-- 7. Missing historical metadata; recorded results remain authoritative.
select m.id, t.name as tournament, m.round_number, m.event_id,
       m.started_at, m.completed_at, m.played_on, m.table_number,
       count(mp.id) as player_rows,
       count(mp.result) as recorded_player_results,
       (count(mp.id) > 0 and count(mp.result) = count(mp.id)) as all_results_reported
from public.matches m
left join public.tournaments t on t.id = m.tournament_id
left join public.match_participants mp on mp.match_id = m.id
group by m.id, t.name
order by t.name, m.round_number, m.created_at;

-- 8. Storage metadata only, not asset downloads.
select id, name, public from storage.buckets order by id;
select bucket_id, count(*) as object_count from storage.objects group by bucket_id order by bucket_id;
