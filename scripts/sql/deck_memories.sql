-- Apply after weekend_house.sql and roster_phone_sessions.sql. Re-runnable.
begin;
alter table public.event_decks add column if not exists title text not null default 'My Limited deck';
alter table public.event_decks add column if not exists note text not null default '';
alter table public.event_decks add column if not exists revision integer not null default 0;
alter table public.event_decks add column if not exists incomplete boolean not null default false;
alter table public.event_decks add column if not exists shared boolean not null default false;
alter table public.event_decks add column if not exists is_current boolean not null default true;
alter table public.event_decks add column if not exists updated_at timestamptz not null default now();
alter table public.event_decks add column if not exists decisions jsonb not null default '{}'::jsonb;
alter table public.event_decks add column if not exists cards jsonb not null default '[]'::jsonb;

-- Preserve older duplicate snapshots; only the newest is the editable current memory.
with ranked as (
  select id, row_number() over (partition by tournament_id, profile_id order by created_at desc, id desc) n
  from public.event_decks where is_current and tournament_id is not null and profile_id is not null
) update public.event_decks d set is_current = false from ranked r where d.id=r.id and r.n>1;
create unique index if not exists event_decks_current_player on public.event_decks(tournament_id,profile_id) where is_current;
alter table public.event_deck_cards add column if not exists oracle_id text;
alter table public.event_deck_cards add column if not exists manually_edited boolean not null default false;
alter table public.event_deck_cards add column if not exists sources jsonb not null default '[]'::jsonb;
update public.event_decks d set cards = coalesce((
  select jsonb_agg(jsonb_build_object('key',coalesce(c.oracle_id,c.scryfall_id,c.id::text),'name',c.name,'count',c.count,
    'oracleId',c.oracle_id,'printingId',c.scryfall_id,'imageUrl',c.image_url,'typeLine','',
    'verified',not coalesce(c.flagged,true),'edited',false,'sources','[]'::jsonb))
  from public.event_deck_cards c where c.event_deck_id=d.id
),'[]'::jsonb) where d.cards='[]'::jsonb;

create table if not exists public.deck_memory_photos (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.event_decks(id) on delete cascade,
  raw_key text not null unique,
  normalized_key text,
  recognition_key text,
  checksum text,
  width integer,
  height integer,
  purpose text not null check (purpose in ('initial','check','additional','recheck')),
  status text not null default 'pending' check(status in ('pending','ready','failed')),
  created_at timestamptz not null default now()
);
create table if not exists public.deck_memory_attempts (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid references public.event_decks(id) on delete set null,
  photo_id uuid references public.deck_memory_photos(id) on delete set null,
  event_id uuid not null,
  profile_id uuid not null,
  provider text not null check(provider in ('google','openai')),
  model text not null,
  analysis_key uuid not null,
  request_key uuid not null,
  purpose text not null check(purpose in ('initial','check','additional','recheck')),
  baseline_revision integer not null,
  selection text not null check(selection in ('google','openai','both')),
  region jsonb,
  status text not null default 'processing' check(status in ('processing','ready','failed')),
  observations jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  error_category text,
  input_tokens integer,
  output_tokens integer,
  reserved_usd numeric not null,
  actual_usd numeric,
  latency_ms integer,
  prompt_version text not null default 'deck-memory-v1',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(request_key,provider)
);
create index if not exists deck_memory_attempts_memory on public.deck_memory_attempts(memory_id,created_at desc);
create table if not exists public.deck_memory_cleanup (
  object_key text primary key,
  created_at timestamptz not null default now()
);
create table if not exists public.deck_card_catalog (
  lookup_key text primary key,
  card jsonb not null,
  updated_at timestamptz not null default now()
);
-- One persistent upstream request lease across all Node processes.
create table if not exists public.deck_catalog_rate (id boolean primary key default true check(id), next_at timestamptz not null);
insert into public.deck_catalog_rate values(true,now()) on conflict do nothing;

-- Import old bucket URLs as owned storage keys; never fetch a client URL.
insert into public.deck_memory_photos(memory_id,raw_key,purpose)
select d.id, split_part(p, '/storage/v1/object/public/deck-photos/',2), 'initial'
from public.event_decks d cross join lateral unnest(d.photo_paths) p
where p like '%/storage/v1/object/public/deck-photos/%'
  and split_part(p, '/storage/v1/object/public/deck-photos/',2) <> ''
on conflict(raw_key) do nothing;

create or replace function public.can_read_deck_memory(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.event_decks d where d.id=p_id
   and (d.profile_id=public.current_profile_id() or (d.shared and d.status='confirmed' and public.current_profile_id() is not null)))
$$;
create or replace function public.owns_deck_memory(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.event_decks d where d.id=p_id and d.profile_id=public.current_profile_id())
$$;
create or replace function public.can_read_deck_object(p_name text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.deck_memory_photos p where
 (p_name=p.normalized_key or p_name=p.recognition_key or (p_name=p.raw_key and public.owns_deck_memory(p.memory_id)))
 and public.can_read_deck_memory(p.memory_id))
$$;
create or replace function public.can_upload_deck_object(p_name text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.deck_memory_photos p where p_name=p.raw_key and p.status='pending' and public.owns_deck_memory(p.memory_id))
$$;

-- Drop all legacy permissive policies on these feature-owned tables.
do $$ declare r record; begin
 for r in select tablename,policyname from pg_policies where schemaname='public'
 and tablename in ('event_decks','event_deck_cards','deck_memory_photos','deck_memory_attempts') loop
 execute format('drop policy %I on public.%I',r.policyname,r.tablename);
 end loop;
end $$;
alter table public.event_decks enable row level security;
alter table public.event_deck_cards enable row level security;
alter table public.deck_memory_photos enable row level security;
alter table public.deck_memory_attempts enable row level security;
alter table public.deck_memory_cleanup enable row level security;
alter table public.deck_card_catalog enable row level security;
alter table public.deck_catalog_rate enable row level security;
create policy memory_read on public.event_decks for select to authenticated using(public.can_read_deck_memory(id));
create policy memory_cards_read on public.event_deck_cards for select to authenticated using(public.can_read_deck_memory(event_deck_id));
create policy memory_photos_read on public.deck_memory_photos for select to authenticated using(public.can_read_deck_memory(memory_id));
create policy memory_attempts_read on public.deck_memory_attempts for select to authenticated using(public.owns_deck_memory(memory_id));
revoke all on public.event_decks,public.event_deck_cards,public.deck_memory_photos,public.deck_memory_attempts from anon,authenticated;
grant select on public.event_decks,public.event_deck_cards,public.deck_memory_photos,public.deck_memory_attempts to authenticated;
revoke all on public.deck_memory_cleanup,public.deck_card_catalog,public.deck_catalog_rate from anon,authenticated;
grant all on public.event_decks,public.event_deck_cards,public.deck_memory_photos,public.deck_memory_attempts,public.deck_memory_cleanup,public.deck_card_catalog,public.deck_catalog_rate to service_role;

insert into storage.buckets(id,name,public,file_size_limit) values('deck-photos','deck-photos',false,20971520)
on conflict(id) do update set public=false,file_size_limit=20971520;
drop policy if exists deck_photos_read on storage.objects;
drop policy if exists deck_photos_insert on storage.objects;
drop policy if exists memory_photo_read on storage.objects;
drop policy if exists memory_photo_upload on storage.objects;
-- Restrictive guards also protect this bucket if an unrelated broad storage policy exists.
drop policy if exists memory_bucket_read_guard on storage.objects;
drop policy if exists memory_bucket_insert_guard on storage.objects;
drop policy if exists memory_bucket_update_guard on storage.objects;
drop policy if exists memory_bucket_delete_guard on storage.objects;
create policy memory_photo_read on storage.objects for select to authenticated using(
 bucket_id='deck-photos' and public.can_read_deck_object(name));
create policy memory_photo_upload on storage.objects for insert to authenticated with check(
 bucket_id='deck-photos' and public.can_upload_deck_object(name));
create policy memory_bucket_read_guard on storage.objects as restrictive for select to public using(
 bucket_id<>'deck-photos' or public.can_read_deck_object(name));
create policy memory_bucket_insert_guard on storage.objects as restrictive for insert to public with check(
 bucket_id<>'deck-photos' or public.can_upload_deck_object(name));
create policy memory_bucket_update_guard on storage.objects as restrictive for update to public using(bucket_id<>'deck-photos');
create policy memory_bucket_delete_guard on storage.objects as restrictive for delete to public using(bucket_id<>'deck-photos');

create or replace function public.resume_deck_memory(p_tournament uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare player uuid:=public.current_profile_id(); tournament public.tournaments; result uuid;
begin
 if player is null then raise exception 'Choose your name first.'; end if;
 select * into tournament from public.tournaments where id=p_tournament;
 if tournament.event_id is null or tournament.format not in ('draft','set_draft','chaos_draft','cube','sealed') then raise exception 'Limited tournament not found.'; end if;
 -- An existing memory remains accessible after a player drops.
 select id into result from public.event_decks where tournament_id=p_tournament and profile_id=player and is_current;
 if result is not null then return result; end if;
 if not exists(select 1 from public.tournament_participants where tournament_id=p_tournament and profile_id=player) then raise exception 'Join this tournament before saving a deck.'; end if;
 insert into public.event_decks(event_id,tournament_id,profile_id,title)
 values(tournament.event_id,p_tournament,player,'My Limited deck')
 on conflict(tournament_id,profile_id) where is_current do update set is_current=true returning id into result;
 return result;
end $$;

create or replace function public.save_deck_memory(p_id uuid,p_revision integer,p_title text,p_note text,p_cards jsonb,p_decisions jsonb,p_confirm boolean,p_incomplete boolean,p_acknowledged boolean) returns integer
language plpgsql security definer set search_path='' as $$
declare d public.event_decks; c jsonb; result integer; total integer:=0;
begin
 select * into d from public.event_decks where id=p_id for update;
 if d.id is null or not public.owns_deck_memory(p_id) then raise exception 'You can only edit your own deck.'; end if;
 if p_revision is null or d.revision<>p_revision then raise exception 'This deck changed in another tab. Reload before saving.'; end if;
 if p_title is null or length(trim(p_title)) not between 1 and 120 or length(p_note)>2000 then raise exception 'Enter a title up to 120 characters and a note up to 2000 characters.'; end if;
 if p_cards is null or jsonb_typeof(p_cards)<>'array' or jsonb_array_length(p_cards)>200 then raise exception 'Invalid card list.'; end if;
 if p_decisions is null or jsonb_typeof(p_decisions)<>'object' or pg_column_size(p_decisions)>100000 then raise exception 'Invalid review decisions.'; end if;
 for c in select value from jsonb_array_elements(p_cards) loop
  if length(trim(c->>'name')) not between 1 and 200 or c->>'name' is null
   or (c->>'count')::numeric<>trunc((c->>'count')::numeric) or (c->>'count')::integer not between 1 and 250 or c->>'count' is null then raise exception 'Check card names and quantities.'; end if;
  total:=total+(c->>'count')::integer;
  if p_confirm and not coalesce((c->>'verified')::boolean,false) and not p_acknowledged then raise exception 'Acknowledge unverified cards before saving.'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_cards) v group by coalesce(v->>'oracleId',lower(v->>'name')) having count(*)>1)
 or exists(select 1 from jsonb_array_elements(p_cards) v group by lower(v->>'name') having count(*)>1) then raise exception 'Combine duplicate cards before saving.'; end if;
 if (p_confirm or d.status='confirmed') and (total=0 or (total<40 and not p_incomplete)) then raise exception 'Mark the memory incomplete if fewer than 40 cards are recorded.'; end if;
 update public.event_decks set title=trim(p_title),note=p_note,cards=p_cards,decisions=p_decisions,
 incomplete=p_incomplete, status=case when p_confirm or d.status='confirmed' then 'confirmed' else 'pending' end,
 revision=revision+1,updated_at=now() where id=p_id returning revision into result;
 delete from public.event_deck_cards where event_deck_id=p_id;
 insert into public.event_deck_cards(event_deck_id,name,count,oracle_id,scryfall_id,image_url,flagged,manually_edited,sources)
 select p_id,v->>'name',(v->>'count')::integer,v->>'oracleId',v->>'printingId',v->>'imageUrl',
 not coalesce((v->>'verified')::boolean,false),coalesce((v->>'edited')::boolean,false),coalesce(v->'sources','[]'::jsonb)
 from jsonb_array_elements(p_cards) v;
 return result;
end $$;

create or replace function public.prepare_deck_photo(p_memory uuid,p_purpose text) returns public.deck_memory_photos
language plpgsql security definer set search_path='' as $$
declare p public.deck_memory_photos; photo uuid:=gen_random_uuid();
begin
 perform 1 from public.event_decks where id=p_memory for update;
 if not public.owns_deck_memory(p_memory) then raise exception 'You can only photograph your own deck.'; end if;
 if (select count(*) from public.deck_memory_photos where memory_id=p_memory)>=4 then raise exception 'Keep at most four photos. Remove one before adding another.'; end if;
 insert into public.deck_memory_photos(id,memory_id,raw_key,purpose)
 values(photo,p_memory,p_memory::text||'/'||photo::text||'/original',p_purpose) returning * into p;
 return p;
end $$;

create or replace function public.share_deck_memory(p_id uuid,p_shared boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.event_decks where id=p_id for update;
 if not public.owns_deck_memory(p_id) then raise exception 'You can only share your own deck.'; end if;
 if p_shared and not exists(select 1 from public.event_decks d join public.tournaments t on t.id=d.tournament_id where d.id=p_id and d.status='confirmed' and t.status='completed') then raise exception 'Save the deck and finish the tournament before sharing.'; end if;
 update public.event_decks set shared=p_shared,revision=revision+1,updated_at=now() where id=p_id;
end $$;
create or replace function public.queue_deck_photo_cleanup() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.deck_memory_cleanup(object_key) select k from unnest(array[old.raw_key,old.normalized_key,old.recognition_key]) k where k is not null on conflict do nothing;
 return old;
end $$;
drop trigger if exists deck_photo_cleanup on public.deck_memory_photos;
create trigger deck_photo_cleanup after delete on public.deck_memory_photos for each row execute function public.queue_deck_photo_cleanup();
create or replace function public.delete_deck_memory_item(p_id uuid,p_photo uuid default null) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.owns_deck_memory(p_id) then raise exception 'You can only delete your own deck or photos.'; end if;
 if p_photo is null then delete from public.event_decks where id=p_id;
 else delete from public.deck_memory_photos where id=p_photo and memory_id=p_id; end if;
end $$;

-- Server-only reservation serializes per event: no concurrent overspend or hourly bypass.
create or replace function public.reserve_deck_analysis(p_memory uuid,p_photo uuid,p_player uuid,p_provider text,p_model text,p_key uuid,p_group uuid,p_purpose text,p_selection text,p_revision integer,p_region jsonb,p_reserve numeric,p_budget numeric,p_hour_limit integer) returns public.deck_memory_attempts
language plpgsql security definer set search_path='' as $$
declare d public.event_decks; reserved public.deck_memory_attempts;
begin
 select * into d from public.event_decks where id=p_memory and profile_id=p_player;
 if d.id is null then raise exception 'Deck not found.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(d.event_id::text,0));
 select * into reserved from public.deck_memory_attempts where request_key=p_key and provider=p_provider;
 if reserved.id is not null then
  if reserved.memory_id<>p_memory or reserved.photo_id<>p_photo then raise exception 'Invalid retry.'; end if;
  if reserved.status='processing' and reserved.created_at<now()-interval '3 minutes' then
   update public.deck_memory_attempts set status='failed',error_category='interrupted',completed_at=now() where id=reserved.id returning * into reserved;
  end if;
  return reserved;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_player::text,1));
 if not exists(select 1 from public.deck_memory_photos where id=p_photo and memory_id=p_memory and status='ready') then raise exception 'Finish uploading the photo first.'; end if;
 if (select count(*) from public.deck_memory_attempts a where a.profile_id=p_player and a.created_at>now()-interval '1 hour')>=p_hour_limit then raise exception 'Photo reading limit reached. You can still enter cards manually.'; end if;
 if (select coalesce(sum(coalesce(a.actual_usd,a.reserved_usd)),0) from public.deck_memory_attempts a where a.event_id=d.event_id)+p_reserve>p_budget then raise exception 'This event reached its photo reading budget. Manual entry is still available.'; end if;
 insert into public.deck_memory_attempts(memory_id,photo_id,event_id,profile_id,provider,model,analysis_key,request_key,purpose,selection,baseline_revision,region,reserved_usd)
 values(p_memory,p_photo,d.event_id,p_player,p_provider,p_model,p_group,p_key,p_purpose,p_selection,p_revision,p_region,p_reserve) returning * into reserved;
 return reserved;
end $$;

create or replace function public.lease_deck_catalog_request() returns timestamptz
language plpgsql security definer set search_path='' as $$
declare result timestamptz;
begin
 select greatest(now(),next_at) into result from public.deck_catalog_rate where id for update;
 update public.deck_catalog_rate set next_at=result+interval '150 milliseconds' where id;
 return result;
end $$;
create or replace function public.expire_deck_memory_drafts() returns void
language plpgsql security definer set search_path='' as $$
begin
 delete from public.event_decks where status='pending' and updated_at<now()-interval '30 days';
 -- Unfinished uploads expire separately; successful normalized photos remain with memories.
 delete from public.deck_memory_photos where status<>'ready' and created_at<now()-interval '1 day';
end $$;

-- Functions default to PUBLIC execute: explicitly remove that privilege.
do $$ declare r record; begin
 for r in select p.oid::regprocedure signature,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('can_read_deck_memory','owns_deck_memory','can_read_deck_object','can_upload_deck_object','resume_deck_memory','save_deck_memory','prepare_deck_photo','share_deck_memory','delete_deck_memory_item','queue_deck_photo_cleanup','reserve_deck_analysis','lease_deck_catalog_request','expire_deck_memory_drafts') loop
 execute format('revoke all on function %s from public,anon,authenticated',r.signature);
 execute format('grant execute on function %s to service_role',r.signature);
 if r.proname in ('can_read_deck_memory','owns_deck_memory','resume_deck_memory','save_deck_memory','prepare_deck_photo','share_deck_memory','delete_deck_memory_item') then execute format('grant execute on function %s to authenticated',r.signature); end if;
 if r.proname in ('can_read_deck_object','can_upload_deck_object') then execute format('grant execute on function %s to authenticated,anon',r.signature); end if;
 end loop;
end $$;
commit;
