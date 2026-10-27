-- Apply after deck_memory_categories.sql; retain existing sharing choices.
begin;
alter table public.event_decks add column if not exists confirmed_revision integer;
update public.event_decks set confirmed_revision=revision where status='confirmed' and confirmed_revision is null;
create or replace function public.save_deck_memory(p_id uuid,p_revision integer,p_title text,p_note text,p_cards jsonb,p_decisions jsonb,p_confirm boolean,p_incomplete boolean,p_acknowledged boolean,p_categories jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare d public.event_decks; c jsonb; result integer; total integer;
begin
 select * into d from public.event_decks where id=p_id for update;
 if d.id is null or not public.owns_deck_memory(p_id) then raise exception 'You can only edit your own deck.'; end if;
 if p_revision is null or d.revision<>p_revision then raise exception 'This deck changed in another tab. Reload before saving.'; end if;
 if p_title is null or length(trim(p_title)) not between 1 and 120 or p_note is null or length(p_note)>2000 then raise exception 'Enter a title up to 120 characters and a note up to 2000 characters.'; end if;
 total:=public.validate_deck_organization(p_cards,p_categories);
 if p_decisions is null or jsonb_typeof(p_decisions)<>'object' or pg_column_size(p_decisions)>100000 then raise exception 'Invalid review decisions.'; end if;
 for c in select value from jsonb_array_elements(p_cards) loop
  if c->>'name' is null or length(trim(c->>'name')) not between 1 and 200 then raise exception 'Check card names and quantities.'; end if;
  if p_confirm and not coalesce((c->>'verified')::boolean,false) and not p_acknowledged then raise exception 'Acknowledge unverified cards before saving.'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_cards) v group by coalesce(v->>'oracleId',lower(v->>'name')) having count(*)>1)
 or exists(select 1 from jsonb_array_elements(p_cards) v group by lower(v->>'name') having count(*)>1) then raise exception 'Combine duplicate cards before saving.'; end if;
 if p_confirm and (total=0 or (total<40 and not p_incomplete)) then raise exception 'Mark the memory incomplete if fewer than 40 main-deck cards are recorded.'; end if;
 update public.event_decks set title=trim(p_title),note=p_note,cards=p_cards,categories=p_categories,decisions=p_decisions,
 incomplete=p_incomplete,status=case when p_confirm or d.status='confirmed' then 'confirmed' else 'pending' end,
 confirmed_revision=case when p_confirm then revision+1 else confirmed_revision end,revision=revision+1,updated_at=now() where id=p_id returning revision into result;
 delete from public.event_deck_cards where event_deck_id=p_id;
 insert into public.event_deck_cards(event_deck_id,name,count,oracle_id,scryfall_id,image_url,flagged,manually_edited,sources,allocations)
 select p_id,v->>'name',(v->>'count')::integer,v->>'oracleId',v->>'printingId',v->>'imageUrl',
 not coalesce((v->>'verified')::boolean,false),coalesce((v->>'edited')::boolean,false),coalesce(v->'sources','[]'::jsonb),coalesce(v->'allocations','[]'::jsonb)
 from jsonb_array_elements(p_cards) v;
 return result;
end $$;
-- A retained share choice never publishes changes that are only autosaved.
create or replace function public.can_read_deck_memory(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.event_decks d where d.id=p_id
 and (d.profile_id=public.current_profile_id() or (d.shared and d.status='confirmed' and d.confirmed_revision=d.revision and public.current_profile_id() is not null)))
$$;
create or replace function public.share_deck_memory(p_id uuid,p_shared boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.event_decks where id=p_id for update;
 if not public.owns_deck_memory(p_id) then raise exception 'You can only share your own deck.'; end if;
 if p_shared and not exists(select 1 from public.event_decks d join public.tournaments t on t.id=d.tournament_id where d.id=p_id and d.status='confirmed' and d.confirmed_revision=d.revision and t.status='completed') then raise exception 'Confirm the deck memory and finish the tournament before sharing.'; end if;
 update public.event_decks set shared=p_shared,
 confirmed_revision=case when confirmed_revision=revision then revision+1 else confirmed_revision end,
 revision=revision+1,updated_at=now() where id=p_id;
end $$;
notify pgrst,'reload schema';
commit;
