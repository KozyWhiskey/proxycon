-- Weekend house: activities, join codes, deck snapshots.
-- Safe to re-run. Organization tables are left in place.

alter table public.tournaments add column if not exists starts_on date;
alter table public.tournaments add column if not exists card_source text default 'set';
alter table public.tournaments add column if not exists set_codes text[];
alter table public.tournaments add column if not exists cube_list text;
alter table public.tournaments add column if not exists invite_code text;
alter table public.tournaments add column if not exists singleton boolean default false;

create unique index if not exists tournaments_invite_code_key
  on public.tournaments (invite_code)
  where invite_code is not null;

alter table public.tournament_participants add column if not exists dropped boolean default false;

alter table public.matches add column if not exists join_code text;

create unique index if not exists matches_join_code_key
  on public.matches (join_code)
  where join_code is not null;

create table if not exists public.event_decks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  photo_paths text[] default '{}',
  status text default 'pending' check (status in ('pending', 'confirmed')),
  created_at timestamptz default now()
);

create table if not exists public.event_deck_cards (
  id uuid primary key default gen_random_uuid(),
  event_deck_id uuid references public.event_decks(id) on delete cascade,
  name text not null,
  scryfall_id text,
  set_code text,
  collector_number text,
  count integer default 1,
  image_url text,
  flagged boolean default false
);

alter table public.event_decks enable row level security;
alter table public.event_deck_cards enable row level security;

do $$ begin
  create policy event_decks_authenticated on public.event_decks
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy event_deck_cards_authenticated on public.event_deck_cards
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;

insert into storage.buckets (id, name, public)
values ('deck-photos', 'deck-photos', true)
on conflict (id) do nothing;

do $$ begin
  create policy deck_photos_read on storage.objects
    for select to public using (bucket_id = 'deck-photos');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy deck_photos_insert on storage.objects
    for insert to authenticated with check (bucket_id = 'deck-photos');
exception when duplicate_object then null;
end $$;

-- Open seats can exist before anyone logs in. A player claims the number later.
alter table public.tournament_participants alter column profile_id drop not null;
alter table public.match_participants alter column profile_id drop not null;
alter table public.match_participants add column if not exists participant_id uuid references public.tournament_participants(id);
alter table public.match_participants add column if not exists seat_number integer;

alter table public.tournaments add column if not exists planned boolean default false;
alter table public.tournaments add column if not exists brought_by uuid references public.profiles(id);
alter table public.tournaments add column if not exists product_note text;
alter table public.tournaments add column if not exists abdicated boolean default false;

alter table public.tournament_participants add column if not exists budget_url text;
alter table public.tournament_participants add column if not exists budget_name text;
alter table public.tournament_participants add column if not exists budget_price numeric;
alter table public.tournament_participants add column if not exists budget_list text;

create table if not exists public.event_prizes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  name text not null,
  note text,
  brought_by uuid references public.profiles(id),
  awarded_to uuid references public.profiles(id),
  tournament_id uuid references public.tournaments(id),
  place integer,
  created_at timestamptz default now()
);

alter table public.event_prizes enable row level security;

do $$ begin
  create policy event_prizes_authenticated on public.event_prizes
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null;
end $$;
