begin;
alter table public.tournaments add column if not exists pod_orientations jsonb not null default '{}'::jsonb;
alter table public.tournaments add column if not exists finished_at timestamptz;
alter table public.matches add column if not exists creation_request_id uuid;
create unique index if not exists matches_creation_request_id on public.matches(creation_request_id) where creation_request_id is not null;
create or replace function public.weekend_can_manage(p_event uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.events where id=p_event) and (public.is_weekend_admin() or (public.current_player_context()->>'mode')='house' or exists(select 1 from public.event_members where event_id=p_event and profile_id=public.current_profile_id()));
$$;
revoke all on function public.weekend_can_manage(uuid) from public,anon;
grant execute on function public.weekend_can_manage(uuid) to authenticated;
create table if not exists public.event_agenda_items(
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
 day date not null,title text not null check(char_length(btrim(title)) between 1 and 100),timing text not null default '' check(char_length(timing)<=80),
 supplies_owner uuid references public.profiles(id) on delete set null,note text not null default '' check(char_length(note)<=500),
 tournament_id uuid references public.tournaments(id) on delete set null,position integer not null default 0,revision integer not null default 1,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.event_agenda_items enable row level security;
drop policy if exists agenda_read on public.event_agenda_items;
create policy agenda_read on public.event_agenda_items for select to authenticated using(exists(select 1 from public.events e where e.id=event_id));
revoke all on public.event_agenda_items from anon,authenticated;
grant select on public.event_agenda_items to authenticated;
create or replace function public.edit_weekend_agenda(p_event uuid,p_item uuid,p_revision integer,p_operation text,p_values jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare item public.event_agenda_items; other public.event_agenda_items; result uuid; pos integer;
begin
 if not public.weekend_can_manage(p_event) then raise exception 'Join the event before editing plans.';end if;
 perform 1 from public.events where id=p_event for update;
 if p_item is not null then select * into item from public.event_agenda_items where id=p_item and event_id=p_event for update;
 if item.id is null or item.revision<>p_revision then raise exception 'This plan changed. Reload it before saving your changes.';end if;end if;
 if p_operation='delete' then delete from public.event_agenda_items where id=item.id;return item.id;end if;
 if p_operation in ('up','down') then
 select * into other from public.event_agenda_items where event_id=p_event and day=item.day and id<>item.id and (case when p_operation='up' then (position,id)<(item.position,item.id) else (position,id)>(item.position,item.id) end)
 order by case when p_operation='up' then position end desc,case when p_operation='down' then position end asc,id limit 1;
 if other.id is not null then
 update public.event_agenda_items set position=other.position,revision=revision+1,updated_at=now() where id=item.id;
 update public.event_agenda_items set position=item.position,revision=revision+1,updated_at=now() where id=other.id;end if;return item.id;
 end if;
 if p_operation<>'save' then raise exception 'Unknown plan action.';end if;
 if not exists(select 1 from public.events where id=p_event and (start_date is null or (p_values->>'day')::date>=start_date) and (end_date is null or (p_values->>'day')::date<=end_date)) then raise exception 'Choose a day within the event dates.';end if;
 if nullif(p_values->>'supplies_owner','') is not null and not exists(select 1 from public.event_members where event_id=p_event and profile_id=(p_values->>'supplies_owner')::uuid) then raise exception 'Choose a supplies owner from this event.';end if;
 if nullif(p_values->>'tournament_id','') is not null and not exists(select 1 from public.tournaments where event_id=p_event and id=(p_values->>'tournament_id')::uuid) then raise exception 'Choose a tournament from this event.';end if;
 select coalesce(max(position),0)+1 into pos from public.event_agenda_items where event_id=p_event and day=(p_values->>'day')::date;
 if item.id is null then
 insert into public.event_agenda_items(event_id,day,title,timing,supplies_owner,note,tournament_id,position) values(p_event,(p_values->>'day')::date,btrim(p_values->>'title'),coalesce(p_values->>'timing',''),nullif(p_values->>'supplies_owner','')::uuid,coalesce(p_values->>'note',''),nullif(p_values->>'tournament_id','')::uuid,pos) returning id into result;
 else update public.event_agenda_items set day=(p_values->>'day')::date,title=btrim(p_values->>'title'),timing=coalesce(p_values->>'timing',''),supplies_owner=nullif(p_values->>'supplies_owner','')::uuid,note=coalesce(p_values->>'note',''),tournament_id=nullif(p_values->>'tournament_id','')::uuid,position=case when day=(p_values->>'day')::date then position else pos end,revision=revision+1,updated_at=now() where id=item.id returning id into result;end if;
 return result;
end $$;
revoke all on function public.edit_weekend_agenda(uuid,uuid,integer,text,jsonb) from public,anon;
grant execute on function public.edit_weekend_agenda(uuid,uuid,integer,text,jsonb) to authenticated;
create or replace function public.create_weekend_quick(p_event uuid,p_request uuid,p_values jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;profile uuid;players uuid[];winners uuid[];format text;min_players integer;max_players integer;finished boolean;deck uuid;side integer; i integer:=0;
begin
 if not public.weekend_can_manage(p_event) then raise exception 'Join the event first.';end if;
 if p_request is null then raise exception 'A game request is required.';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select id into result from public.matches where creation_request_id=p_request and event_id=p_event;
 if result is not null then return result;end if;
 select array_agg(value::uuid) into players from jsonb_array_elements_text(p_values->'profileIds');
 select array_agg(value::uuid) into winners from jsonb_array_elements_text(coalesce(p_values->'winnerIds','[]'::jsonb));
 format:=p_values->>'format';min_players:=2;max_players:=2;
 if format in ('commander','commander_15','commander_30','cedh','planechase','archenemy') then max_players:=6;
 elsif format='two_headed_giant' then min_players:=4;max_players:=4;
 elsif format in ('winston','pack_wars') then max_players:=3;
 elsif format in ('emperor','star') then min_players:=3;max_players:=8;
 elsif format='custom' then max_players:=8;
 elsif format not in ('one_v_one','standard','jumpstart','1v1') then raise exception 'Choose a supported format.';end if;
 if coalesce(cardinality(players),0)<min_players or cardinality(players)>max_players or cardinality(players)<>(select count(distinct unnest) from unnest(players)) then raise exception 'Choose a valid group for this format.';end if;
 if exists(select 1 from unnest(players) p where not exists(select 1 from public.event_members where event_id=p_event and profile_id=p)) then raise exception 'Choose players who joined this event.';end if;
 if exists(select 1 from unnest(coalesce(winners,'{}'::uuid[])) w where not w=any(players)) then raise exception 'Choose a winner from this game.';end if;
 if format='two_headed_giant' and ((select count(*) from unnest(players) p where p_values->'teams'->>p::text='1')<>2 or (select count(*) from unnest(players) p where p_values->'teams'->>p::text='2')<>2) then raise exception 'Two-Headed Giant is two teams of two.';end if;
 if format in ('two_headed_giant','emperor','star') and (exists(select 1 from unnest(players) p where coalesce(p_values->'teams'->>p::text,'') not in ('1','2')) or (select count(distinct p_values->'teams'->>p::text) from unnest(players) p)<>2) then raise exception 'Assign every player to one of two sides.';end if;
 finished:=coalesce((p_values->>'draw')::boolean,false) or coalesce(cardinality(winners),0)>0;
 if finished and not coalesce((p_values->>'draw')::boolean,false) then
 if format in ('two_headed_giant','emperor','star') then
 if coalesce(cardinality(winners),0)=0 or exists(select 1 from unnest(players) p where ((p=any(winners)) is distinct from (p_values->'teams'->>p::text=p_values->'teams'->>winners[1]::text))) then raise exception 'Choose one complete winning side.';end if;
 elsif cardinality(winners)<>1 then raise exception 'Choose one winner.';end if;end if;
 if jsonb_array_length(coalesce(p_values->'finishOrder','[]'::jsonb))>cardinality(players) or exists(select 1 from jsonb_array_elements_text(coalesce(p_values->'finishOrder','[]'::jsonb)) v where nullif(v,'') is not null and not v::uuid=any(players)) or (select count(*) from jsonb_array_elements_text(coalesce(p_values->'finishOrder','[]'::jsonb)) v where nullif(v,'') is not null)<>(select count(distinct v) from jsonb_array_elements_text(coalesce(p_values->'finishOrder','[]'::jsonb)) v where nullif(v,'') is not null) then raise exception 'Finishing positions must be unique players from this game.';end if;
 insert into public.matches(event_id,creation_request_id,game_type,format_label,played_on,started_at,completed_at,table_label) values(p_event,p_request,format,p_values->>'label',(p_values->>'playedOn')::date,now(),case when finished then now() else null end,p_values->>'label') returning id into result;
 foreach profile in array players loop
 deck:=nullif(p_values->'deckIds'->>profile::text,'')::uuid;
 if deck is not null and not exists(select 1 from public.decks where id=deck and owner_id=profile) then raise exception 'Choose a deck owned by its player.';end if;
 side:=nullif(p_values->'teams'->>profile::text,'')::integer;
 insert into public.match_participants(match_id,profile_id,result,deck_id,team,finish_order) values(result,profile,case when not finished then null when coalesce((p_values->>'draw')::boolean,false) then 'draw' when profile=any(coalesce(winners,'{}'::uuid[])) then 'win' else 'loss' end,deck,side,(select ord::integer from jsonb_array_elements_text(coalesce(p_values->'finishOrder','[]'::jsonb)) with ordinality o(v,ord) where v=profile::text limit 1));
 end loop;return result;
end $$;
revoke all on function public.create_weekend_quick(uuid,uuid,jsonb) from public,anon;
grant execute on function public.create_weekend_quick(uuid,uuid,jsonb) to authenticated;
create or replace function public.commit_weekend_result(p_match uuid,p_expected jsonb,p_rows jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare m public.matches; existing public.match_participants; patch jsonb; total integer; max_games integer; min_games integer;
begin
 select * into m from public.matches where id=p_match for update;
 if m.id is null or not public.weekend_can_manage(m.event_id) then raise exception 'Join the event before reporting results.';end if;
 select count(*) into total from public.match_participants where match_id=p_match;
 if total<2 or jsonb_array_length(p_expected)<>total or jsonb_array_length(p_rows)<>total then raise exception 'The players changed. Reload this match.';end if;
 if (select count(distinct v->>'id') from jsonb_array_elements(p_rows) v)<>total then raise exception 'Invalid result rows.';end if;
 for existing in select * from public.match_participants where match_id=p_match loop
 if not exists(select 1 from jsonb_array_elements(p_expected) v where v->>'profileId'=existing.profile_id::text and (v->>'result') is not distinct from existing.result and nullif(v->>'gamesWon','')::integer is not distinct from existing.games_won) then raise exception 'This result changed while you were editing. Review the current result before saving your correction.';end if;
 select v into patch from jsonb_array_elements(p_rows) v where v->>'id'=existing.id::text and v->>'profile_id'=existing.profile_id::text;
 if patch is null or patch->>'result' is null or patch->>'result' not in ('win','loss','draw') then raise exception 'Choose a valid outcome for every player.';end if;
 if nullif(patch->>'deck_id','')::uuid is distinct from existing.deck_id and nullif(patch->>'deck_id','') is not null and not exists(select 1 from public.decks where id=(patch->>'deck_id')::uuid and owner_id=existing.profile_id) then raise exception 'Choose a deck owned by its player.';end if;
 end loop;
 if m.tournament_id is not null then
 if m.started_at is null or total<>2 or exists(select 1 from jsonb_array_elements(p_rows) v where v->>'games_won' is null or (v->>'games_won')::numeric<0 or (v->>'games_won')::numeric<>trunc((v->>'games_won')::numeric)) then raise exception 'Enter whole-number game wins after the round starts.';end if;
 select max((v->>'games_won')::integer),min((v->>'games_won')::integer) into max_games,min_games from jsonb_array_elements(p_rows) v;
 if max_games=0 or exists(select 1 from jsonb_array_elements(p_rows) v where v->>'result'<>(case when max_games=min_games then 'draw' when (v->>'games_won')::integer=max_games then 'win' else 'loss' end)) then raise exception 'The score must determine the result; 0–0 cannot be saved.';end if;
 end if;
 if exists(select 1 from jsonb_array_elements(p_rows) v where nullif(v->>'finish_order','') is not null and ((v->>'finish_order')::numeric<>trunc((v->>'finish_order')::numeric) or (v->>'finish_order')::numeric not between 1 and total)) or exists(select 1 from jsonb_array_elements(p_rows) v where nullif(v->>'finish_order','') is not null group by (v->>'finish_order')::integer having count(*)>1) then raise exception 'Use distinct finishing positions for selected players.';end if;
 if m.tournament_id is null then
 if exists(select 1 from jsonb_array_elements(p_rows) v where v->>'result'='draw') then
 if exists(select 1 from jsonb_array_elements(p_rows) v where v->>'result'<>'draw') then raise exception 'A draw applies to the whole game.';end if;
 elsif m.game_type in ('two_headed_giant','emperor','star') then
 if (select count(distinct s.team) from public.match_participants s join jsonb_array_elements(p_rows) v on v->>'id'=s.id::text where s.match_id=p_match and v->>'result'='win')<>1 or exists(select 1 from public.match_participants s join jsonb_array_elements(p_rows) v on v->>'id'=s.id::text where s.match_id=p_match group by s.team having count(distinct v->>'result')>1) then raise exception 'Choose one complete winning side.';end if;
 elsif (select count(*) from jsonb_array_elements(p_rows) v where v->>'result'='win')<>1 then raise exception 'Choose one winner or a draw.';end if;
 end if;
 for patch in select v from jsonb_array_elements(p_rows) v loop update public.match_participants set result=patch->>'result',games_won=nullif(patch->>'games_won','')::integer,deck_id=nullif(patch->>'deck_id','')::uuid,finish_order=nullif(patch->>'finish_order','')::integer where id=(patch->>'id')::uuid and match_id=p_match;end loop;
 update public.matches set completed_at=now() where id=p_match;return total;
end $$;
revoke all on function public.commit_weekend_result(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.commit_weekend_result(uuid,jsonb,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
