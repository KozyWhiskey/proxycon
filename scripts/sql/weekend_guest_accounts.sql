-- Weekend name claims. Additive: keeps every existing account, deck and game ID.
-- Apply as a Supabase database administrator. Enable Anonymous Sign-Ins separately.
begin;

create table if not exists public.weekend_guest_invitations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists public.weekend_guest_spots (
  id uuid primary key default gen_random_uuid(),
  -- Keep claimed identities if an event/invitation is removed.
  invitation_id uuid references public.weekend_guest_invitations(id) on delete set null,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  profile_id uuid unique references public.profiles(id),
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint guest_claim_complete check ((profile_id is null) = (claimed_at is null))
);
create unique index if not exists weekend_guest_spot_names
  on public.weekend_guest_spots (invitation_id, lower(btrim(display_name)));

create or replace function public.is_weekend_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
 select coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
   and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function public.is_weekend_admin() from public;
grant execute on function public.is_weekend_admin() to authenticated;

alter table public.weekend_guest_invitations enable row level security;
alter table public.weekend_guest_spots enable row level security;
revoke all on public.weekend_guest_invitations, public.weekend_guest_spots from public, anon, authenticated;
grant select on public.weekend_guest_invitations, public.weekend_guest_spots to authenticated;
drop policy if exists weekend_admin_read on public.weekend_guest_invitations;
create policy weekend_admin_read on public.weekend_guest_invitations for select to authenticated
 using ((select public.is_weekend_admin()));
drop policy if exists weekend_admin_read on public.weekend_guest_spots;
create policy weekend_admin_read on public.weekend_guest_spots for select to authenticated
 using ((select public.is_weekend_admin()));

create or replace function public.create_weekend_guest_invitation(p_event_id uuid, p_token_hash text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare invitation_id uuid;
begin
 if not public.is_weekend_admin() then raise exception 'Administrator access required.'; end if;
 if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid guest link.'; end if;
 if not exists (select 1 from public.events where id = p_event_id and is_active) then
   raise exception 'Choose an open event.';
 end if;
 insert into public.weekend_guest_invitations (event_id, token_hash, created_by, expires_at)
 values (p_event_id, p_token_hash, auth.uid(), now() + interval '90 days')
 on conflict (event_id) do update set token_hash = excluded.token_hash, expires_at = excluded.expires_at
 returning id into invitation_id;
 return invitation_id;
end;
$$;

create or replace function public.add_weekend_guest_spot(p_invitation_id uuid, p_display_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare spot_id uuid;
begin
 if not public.is_weekend_admin() then raise exception 'Administrator access required.'; end if;
 if p_display_name is null or char_length(btrim(p_display_name)) not between 1 and 60 then
   raise exception 'Enter a play name of 1 to 60 characters.';
 end if;
 if not exists (
   select 1 from public.weekend_guest_invitations i join public.events e on e.id = i.event_id
   where i.id = p_invitation_id and i.expires_at > now() and e.is_active
 ) then raise exception 'Create a guest link for an open event first.'; end if;
 insert into public.weekend_guest_spots (invitation_id, display_name)
 values (p_invitation_id, btrim(p_display_name)) returning id into spot_id;
 return spot_id;
exception when unique_violation then raise exception 'That name already has a spot on this guest list.';
end;
$$;

create or replace function public.read_weekend_guest_invitation(p_token text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare invitation public.weekend_guest_invitations; event_name text;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then return null; end if;
 select i.* into invitation from public.weekend_guest_invitations i
 join public.events e on e.id = i.event_id
 where i.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
   and i.expires_at > now() and e.is_active;
 if not found then return null; end if;
 select name into event_name from public.events where id = invitation.event_id;
 return jsonb_build_object(
   'eventId', invitation.event_id, 'eventName', event_name,
   'spots', coalesce((
     select jsonb_agg(jsonb_build_object('id', g.id, 'name', g.display_name, 'claimed', g.profile_id is not null) order by lower(g.display_name))
     from public.weekend_guest_spots g where g.invitation_id = invitation.id
   ), '[]'::jsonb));
end;
$$;

create or replace function public.claim_weekend_guest_spot(p_token text, p_spot_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare spot public.weekend_guest_spots; event_id uuid; profile_role text;
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false then
   raise exception 'Use a weekend phone session to claim a guest spot.';
 end if;
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'This guest link is invalid.'; end if;
 -- A user can claim once. The advisory lock also serializes competing spots for the same phone.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
 select g.* into spot from public.weekend_guest_spots g
 join public.weekend_guest_invitations i on i.id = g.invitation_id
 join public.events e on e.id = i.event_id
 where g.id = p_spot_id and i.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
   and i.expires_at > now() and e.is_active
 for update of g;
 if not found then raise exception 'This guest link is unavailable. Ask the admin for a new link.'; end if;
 if spot.profile_id is not null and spot.profile_id <> auth.uid() then
   raise exception 'Someone already claimed this spot. Choose your own name or ask the admin.';
 end if;
 if exists (select 1 from public.weekend_guest_spots where profile_id = auth.uid() and id <> spot.id) then
   raise exception 'This phone already has a player profile.';
 end if;
 select role into profile_role from public.profiles where id = auth.uid();
 if profile_role is not null and profile_role <> 'user' then raise exception 'This account cannot claim a guest spot.'; end if;
 select i.event_id into event_id from public.weekend_guest_invitations i where i.id = spot.invitation_id;
 if spot.profile_id is null then
   insert into public.profiles (id, username, display_name, role)
   values (auth.uid(), 'guest_' || left(replace(auth.uid()::text, '-', ''), 12), spot.display_name, 'user')
   on conflict (id) do update set display_name = excluded.display_name;
   update public.weekend_guest_spots set profile_id = auth.uid(), claimed_at = now() where id = spot.id;
 end if;
 insert into public.event_members (event_id, profile_id, role) values (event_id, auth.uid(), 'player')
 on conflict do nothing;
 return event_id;
end;
$$;

create or replace function public.current_weekend_guest_spot()
returns uuid language sql stable security definer set search_path = ''
as $$ select id from public.weekend_guest_spots where profile_id = auth.uid(); $$;
revoke all on function public.current_weekend_guest_spot() from public;
grant execute on function public.current_weekend_guest_spot() to authenticated;

-- Hide incomplete anonymous signups from other players if a claim failed or lost a race.
create or replace function public.is_visible_playgroup_profile(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
 select auth.uid() is not null and (
   p_profile_id = auth.uid()
   or not exists (select 1 from auth.users where id = p_profile_id and is_anonymous)
   or exists (select 1 from public.weekend_guest_spots where profile_id = p_profile_id)
 );
$$;
revoke all on function public.is_visible_playgroup_profile(uuid) from public;
grant execute on function public.is_visible_playgroup_profile(uuid) to authenticated;

-- Protect existing account/deck ownership even if older permissive policies exist.
-- New read policies allow the signed-in playgroup directory.
alter table public.profiles enable row level security;
alter table public.decks enable row level security;
revoke all on public.profiles, public.decks from public, anon;
grant select, insert, update, delete on public.profiles, public.decks to authenticated;
drop policy if exists playgroup_read on public.profiles;
create policy playgroup_read on public.profiles for select to authenticated using (public.is_visible_playgroup_profile(id));
drop policy if exists playgroup_profile_visibility on public.profiles;
create policy playgroup_profile_visibility on public.profiles as restrictive for select to authenticated using (public.is_visible_playgroup_profile(id));
drop policy if exists playgroup_read on public.decks;
create policy playgroup_read on public.decks for select to authenticated using (true);

drop policy if exists profile_owner_insert on public.profiles;
create policy profile_owner_insert on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists profile_owner_update on public.profiles;
create policy profile_owner_update on public.profiles for update to authenticated
 using (id = auth.uid() or (select public.is_weekend_admin())) with check (id = auth.uid() or (select public.is_weekend_admin()));
drop policy if exists profile_insert_guard on public.profiles;
create policy profile_insert_guard on public.profiles as restrictive for insert to authenticated with check (id = auth.uid());
drop policy if exists profile_update_guard on public.profiles;
create policy profile_update_guard on public.profiles as restrictive for update to authenticated
 using (id = auth.uid() or (select public.is_weekend_admin())) with check (id = auth.uid() or (select public.is_weekend_admin()));
-- Account deletion has no product flow; only the administrator may delete a profile.
drop policy if exists profile_delete_guard on public.profiles;
create policy profile_delete_guard on public.profiles as restrictive for delete to authenticated using ((select public.is_weekend_admin()));

drop policy if exists deck_owner_write on public.decks;
create policy deck_owner_write on public.decks for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists deck_insert_guard on public.decks;
create policy deck_insert_guard on public.decks as restrictive for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists deck_update_guard on public.decks;
create policy deck_update_guard on public.decks as restrictive for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists deck_delete_guard on public.decks;
create policy deck_delete_guard on public.decks as restrictive for delete to authenticated using (owner_id = auth.uid());

create or replace function public.protect_weekend_profile_role()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 if (tg_op = 'INSERT' and coalesce(new.role, 'user') <> 'user')
    or (tg_op = 'UPDATE' and new.role is distinct from old.role) then
   if not public.is_weekend_admin() then raise exception 'Only an administrator can change account roles.'; end if;
   if new.role = 'admin' and exists (select 1 from public.weekend_guest_spots where profile_id = new.id) then
     raise exception 'Weekend guests cannot be administrators.';
   end if;
 end if;
 return new;
end;
$$;
drop trigger if exists protect_weekend_profile_role on public.profiles;
create trigger protect_weekend_profile_role before insert or update on public.profiles
 for each row execute function public.protect_weekend_profile_role();

revoke all on function public.create_weekend_guest_invitation(uuid, text) from public;
revoke all on function public.add_weekend_guest_spot(uuid, text) from public;
revoke all on function public.read_weekend_guest_invitation(text) from public;
revoke all on function public.claim_weekend_guest_spot(text, uuid) from public;
revoke all on function public.protect_weekend_profile_role() from public;
grant execute on function public.create_weekend_guest_invitation(uuid, text) to authenticated;
grant execute on function public.add_weekend_guest_spot(uuid, text) to authenticated;
grant execute on function public.read_weekend_guest_invitation(text) to anon, authenticated;
grant execute on function public.claim_weekend_guest_spot(text, uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
