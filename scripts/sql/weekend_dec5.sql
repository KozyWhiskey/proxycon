-- December 5 incorporation: prize text, round clock, profile color.
-- Safe to re-run.

alter table public.tournaments add column if not exists prize_1st text;
alter table public.tournaments add column if not exists prize_2nd text;
alter table public.tournaments add column if not exists prize_3rd text;
alter table public.tournaments add column if not exists round_duration_minutes integer default 50;
alter table public.tournaments add column if not exists clock_round integer;
alter table public.tournaments add column if not exists clock_anchor timestamptz;
alter table public.tournaments add column if not exists clock_paused_at timestamptz;
alter table public.tournaments add column if not exists clock_remaining_seconds integer;

alter table public.profiles add column if not exists color text;
