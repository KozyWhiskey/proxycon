-- Weekend loop columns. Safe to re-run.
-- Applied to the live database as migration weekend_loop.

alter table public.decks add column if not exists partner_name text;

alter table public.matches add column if not exists played_on date;
alter table public.matches add column if not exists table_label text;
alter table public.matches add column if not exists format_label text;
alter table public.matches add column if not exists is_rematch boolean default false;
alter table public.matches add column if not exists is_final boolean default false;

alter table public.match_participants add column if not exists team integer;
alter table public.match_participants add column if not exists finish_order integer;

alter table public.tournaments add column if not exists prizes_enabled boolean default false;
alter table public.tournaments add column if not exists pod_count integer default 1;
alter table public.tournaments add column if not exists field_locked boolean default false;

alter table public.tournament_participants add column if not exists place integer;
alter table public.tournament_participants add column if not exists pod integer;
