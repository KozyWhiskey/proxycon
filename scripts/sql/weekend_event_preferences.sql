-- A selected player's event follows their existing profile across devices.
-- House preferences belong to the device's anonymous identity, never to a player.
begin;
create table if not exists public.weekend_event_preferences(
 id uuid primary key default gen_random_uuid(),
 profile_id uuid unique references public.profiles(id) on delete cascade,
 device_user_id uuid unique references auth.users(id) on delete cascade,
 event_id uuid not null references public.events(id) on delete cascade,
 updated_at timestamptz not null default now(),
 check(num_nonnulls(profile_id,device_user_id)=1)
);
alter table public.weekend_event_preferences enable row level security;
revoke all on public.weekend_event_preferences from public,anon,authenticated;
grant select on public.weekend_event_preferences to authenticated;
drop policy if exists own_event_preference on public.weekend_event_preferences;
create policy own_event_preference on public.weekend_event_preferences for select to authenticated using(
 profile_id=public.current_profile_id() or (device_user_id=auth.uid() and public.current_player_context()->>'mode'='house')
);
create or replace function public.remember_weekend_event(p_event uuid) returns void
language plpgsql security definer set search_path='' as $$
declare player uuid:=public.current_profile_id();
begin
 if auth.uid() is null or not exists(select 1 from public.events where id=p_event) then raise exception 'Event unavailable.';end if;
 if public.current_player_context()->>'mode'='house' then
 insert into public.weekend_event_preferences(device_user_id,event_id) values(auth.uid(),p_event)
 on conflict(device_user_id) do update set event_id=excluded.event_id,updated_at=now();
 elsif player is not null then
 insert into public.weekend_event_preferences(profile_id,event_id) values(player,p_event)
 on conflict(profile_id) do update set event_id=excluded.event_id,updated_at=now();
 else raise exception 'Choose your name first.';end if;
end $$;
create or replace function public.remembered_weekend_event() returns uuid
language sql stable security definer set search_path='' as $$
 select p.event_id from public.weekend_event_preferences p join public.events e on e.id=p.event_id
 where auth.uid() is not null and (case when public.current_player_context()->>'mode'='house' then p.device_user_id=auth.uid() else p.profile_id=public.current_profile_id() end) limit 1
$$;
revoke all on function public.remember_weekend_event(uuid),public.remembered_weekend_event() from public,anon;
grant execute on function public.remember_weekend_event(uuid),public.remembered_weekend_event() to authenticated;
notify pgrst,'reload schema';
commit;
