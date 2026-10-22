-- A player can exist with no login. A phone is an anonymous session bound to a player.
-- Existing profile ids, deck owners, and results stay as they are.

alter table public.profiles add column if not exists auth_user_id uuid;
alter table public.profiles add column if not exists selectable boolean not null default true;

update public.profiles p
set auth_user_id = p.id
where p.auth_user_id is null
  and exists (select 1 from auth.users u where u.id = p.id);

create unique index if not exists profiles_auth_user_id_key on public.profiles (auth_user_id);

alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles drop constraint if exists profiles_auth_user_id_fkey;
alter table public.profiles
  add constraint profiles_auth_user_id_fkey
  foreign key (auth_user_id) references auth.users (id) on delete set null;

create table if not exists public.device_sessions (
  device_user_id uuid primary key references auth.users (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  mode text not null check (mode in ('player', 'house')),
  updated_at timestamptz not null default now(),
  constraint device_session_player check (mode = 'house' or profile_id is not null)
);

alter table public.device_sessions enable row level security;
revoke all on public.device_sessions from public, anon, authenticated;

create or replace function public.is_weekend_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and exists (
      select 1 from public.profiles
      where auth_user_id = auth.uid() and role = 'admin'
    );
$$;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then coalesce(
      (select profile_id from public.device_sessions where device_user_id = auth.uid() and mode = 'player'),
      (select id from public.profiles where auth_user_id = auth.uid() and nullif(btrim(display_name), '') is not null)
    )
    else (select id from public.profiles where auth_user_id = auth.uid())
  end;
$$;

create or replace function public.current_player_context()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'profileId', public.current_profile_id(),
    'isAdmin', public.is_weekend_admin(),
    'mode', case
      when coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false then 'account'
      when exists (select 1 from public.device_sessions where device_user_id = auth.uid() and mode = 'house') then 'house'
      when public.current_profile_id() is not null then 'player'
      else 'unbound'
    end
  );
$$;

create or replace function public.join_open_events(p_profile_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.event_members (event_id, profile_id, role)
  select e.id, p_profile_id, 'player'
  from public.events e
  where e.is_active
  on conflict (event_id, profile_id) do nothing;
$$;

create or replace function public.assume_profile(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false then
    raise exception 'This account already has a player.';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = p_profile_id and selectable and nullif(btrim(display_name), '') is not null
  ) then
    raise exception 'Choose a player from the list.';
  end if;
  insert into public.device_sessions (device_user_id, profile_id, mode)
  values (auth.uid(), p_profile_id, 'player')
  on conflict (device_user_id) do update
    set profile_id = excluded.profile_id, mode = 'player', updated_at = now();
  perform public.join_open_events(p_profile_id);
end;
$$;

create or replace function public.assume_house()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false then
    raise exception 'Use the player list on this phone.';
  end if;
  insert into public.device_sessions (device_user_id, profile_id, mode)
  values (auth.uid(), null, 'house')
  on conflict (device_user_id) do update
    set profile_id = null, mode = 'house', updated_at = now();
end;
$$;

create or replace function public.clear_player_binding()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.device_sessions where device_user_id = auth.uid();
$$;

create or replace function public.create_roster_profile(p_display_name text, p_bind boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleaned text := btrim(p_display_name);
  existing_id uuid;
  new_id uuid := gen_random_uuid();
begin
  if auth.uid() is null then
    raise exception 'Open the home screen and try again.';
  end if;
  if cleaned is null or char_length(cleaned) not between 1 and 60 then
    raise exception 'Enter a play name of 1 to 60 characters.';
  end if;
  select id into existing_id
  from public.profiles
  where selectable and lower(btrim(display_name)) = lower(cleaned)
  order by (auth_user_id is not null) desc, created_at
  limit 1;
  if existing_id is not null then
    if p_bind and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
      perform public.assume_profile(existing_id);
    end if;
    return jsonb_build_object('id', existing_id, 'created', false);
  end if;
  insert into public.profiles (id, username, display_name, role, auth_user_id, selectable)
  values (new_id, null, cleaned, 'user', null, true);
  perform public.join_open_events(new_id);
  if p_bind and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    insert into public.device_sessions (device_user_id, profile_id, mode)
    values (auth.uid(), new_id, 'player')
    on conflict (device_user_id) do update
      set profile_id = excluded.profile_id, mode = 'player', updated_at = now();
  end if;
  return jsonb_build_object('id', new_id, 'created', true);
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.is_anonymous, false) then
    return new;
  end if;
  insert into public.profiles (id, username, avatar_url, display_name, auth_user_id, selectable)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'name', '')),
    new.id,
    true
  )
  on conflict (id) do update
    set auth_user_id = excluded.auth_user_id
    where public.profiles.auth_user_id is null;
  return new;
end;
$$;

create or replace function public.protect_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and coalesce(new.role, 'user') <> 'user' and not public.is_weekend_admin() then
    raise exception 'Only an administrator can change account roles.';
  end if;
  if tg_op = 'UPDATE' and not public.is_weekend_admin() and (
    new.role is distinct from old.role
    or new.auth_user_id is distinct from old.auth_user_id
    or new.id is distinct from old.id
  ) then
    raise exception 'Only an administrator can change that.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_identity on public.profiles;
create trigger protect_profile_identity
  before insert or update on public.profiles
  for each row execute function public.protect_profile_identity();

drop policy if exists acting_profile_update on public.profiles;
create policy acting_profile_update on public.profiles
  for update to authenticated
  using (id = public.current_profile_id() or public.is_weekend_admin())
  with check (id = public.current_profile_id() or public.is_weekend_admin());

drop policy if exists acting_deck_write on public.decks;
create policy acting_deck_write on public.decks
  for update to authenticated
  using (owner_id = public.current_profile_id() or public.is_weekend_admin())
  with check (owner_id = public.current_profile_id() or public.is_weekend_admin());

drop policy if exists acting_deck_delete on public.decks;
create policy acting_deck_delete on public.decks
  for delete to authenticated
  using (owner_id = public.current_profile_id() or public.is_weekend_admin());

revoke all on function public.is_weekend_admin() from public;
revoke all on function public.current_profile_id() from public;
revoke all on function public.current_player_context() from public;
revoke all on function public.join_open_events(uuid) from public;
revoke all on function public.assume_profile(uuid) from public;
revoke all on function public.assume_house() from public;
revoke all on function public.clear_player_binding() from public;
revoke all on function public.create_roster_profile(text, boolean) from public;
revoke all on function public.protect_profile_identity() from public;

grant execute on function public.is_weekend_admin() to authenticated;
grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.current_player_context() to authenticated;
grant execute on function public.assume_profile(uuid) to authenticated;
grant execute on function public.assume_house() to authenticated;
grant execute on function public.clear_player_binding() to authenticated;
grant execute on function public.create_roster_profile(text, boolean) to authenticated;

notify pgrst, 'reload schema';
