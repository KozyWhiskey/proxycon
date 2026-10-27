-- Additive deck organization. Apply after deck_memories.sql. Re-runnable.
begin;
alter table public.event_decks add column if not exists categories jsonb not null default '[]'::jsonb;
alter table public.event_deck_cards add column if not exists allocations jsonb not null default '[]'::jsonb;

create or replace function public.validate_deck_organization(p_cards jsonb,p_categories jsonb) returns integer
language plpgsql immutable set search_path='' as $$
declare
 category_map jsonb := '{"type-creatures":{"name":"Creatures","zone":"main"},"type-instants":{"name":"Instants","zone":"main"},"type-sorceries":{"name":"Sorceries","zone":"main"},"type-artifacts":{"name":"Artifacts","zone":"main"},"type-enchantments":{"name":"Enchantments","zone":"main"},"type-planeswalkers":{"name":"Planeswalkers","zone":"main"},"type-lands":{"name":"Lands","zone":"main"},"type-other":{"name":"Other","zone":"main"},"sideboard":{"name":"Sideboard","zone":"sideboard"}}'::jsonb;
 category jsonb; card jsonb; allocation jsonb; category_id text;
 allocated integer; card_count integer; main_count integer:=0;
begin
 if p_categories is null or jsonb_typeof(p_categories)<>'array' or jsonb_array_length(p_categories)>32 then raise exception 'Keep at most 32 categories.'; end if;
 for category in select value from jsonb_array_elements(p_categories) loop
  category_id:=category->>'id';
  if jsonb_typeof(category)<>'object' or category_id is null or
    (not category_map ? category_id and category_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then raise exception 'Invalid category identity.'; end if;
  if category->>'name' is null or jsonb_typeof(category->'name')<>'string' or length(trim(category->>'name')) not between 1 and 48 then raise exception 'Category names must contain 1 to 48 characters.'; end if;
  if category->>'zone' is null or category->>'zone' not in ('main','sideboard') then raise exception 'Choose Main deck or Sideboard for each category.'; end if;
  if category->>'order' is null or jsonb_typeof(category->'order')<>'number' or (category->>'order')::numeric<>trunc((category->>'order')::numeric) or (category->>'order')::numeric not between 0 and 10000 then raise exception 'Invalid category order.'; end if;
  if category_id like 'type-%' and (category->>'zone'<>'main' or category->>'name'<>category_map->category_id->>'name') then raise exception 'Automatic card types keep their name and Main deck section.'; end if;
  if category_id='sideboard' and category->>'zone'<>'sideboard' then raise exception 'Sideboard must remain in the Sideboard section.'; end if;
  category_map:=jsonb_set(category_map,array[category_id],category);
 end loop;
 if exists(select 1 from jsonb_array_elements(p_categories) v group by v->>'id' having count(*)>1) then raise exception 'Category identities must be unique.'; end if;
 if exists(select 1 from jsonb_each(category_map) v group by v.value->>'zone',lower(trim(v.value->>'name')) having count(*)>1) then raise exception 'Use unique category names within each section.'; end if;
 if p_cards is null or jsonb_typeof(p_cards)<>'array' or jsonb_array_length(p_cards)>200 then raise exception 'Invalid card list.'; end if;
 for card in select value from jsonb_array_elements(p_cards) loop
  if jsonb_typeof(card->'count')<>'number' or card->>'count' is null or (card->>'count')::numeric<>trunc((card->>'count')::numeric) or (card->>'count')::numeric not between 1 and 250 then raise exception 'Check card names and quantities.'; end if;
  card_count:=(card->>'count')::integer; allocated:=0; main_count:=main_count+card_count;
  if card ? 'allocations' then
   if jsonb_typeof(card->'allocations')<>'array' or jsonb_array_length(card->'allocations')>32 then raise exception 'Invalid card allocations.'; end if;
   if exists(select 1 from jsonb_array_elements(card->'allocations') v group by v->>'categoryId' having count(*)>1) then raise exception 'Combine duplicate category allocations.'; end if;
   for allocation in select value from jsonb_array_elements(card->'allocations') loop
    category_id:=allocation->>'categoryId';
    if category_id is null or not category_map ? category_id then raise exception 'A card refers to a missing category.'; end if;
    if allocation->>'count' is null or jsonb_typeof(allocation->'count')<>'number' or (allocation->>'count')::numeric<>trunc((allocation->>'count')::numeric) or (allocation->>'count')::numeric not between 1 and 250 then raise exception 'Allocation quantities must be positive whole numbers.'; end if;
    allocated:=allocated+(allocation->>'count')::integer;
    if category_map->category_id->>'zone'='sideboard' then main_count:=main_count-(allocation->>'count')::integer; end if;
   end loop;
  end if;
  if allocated>card_count then raise exception 'Allocated copies cannot exceed the recorded quantity.'; end if;
 end loop;
 return main_count;
end $$;
revoke all on function public.validate_deck_organization(jsonb,jsonb) from public,anon,authenticated;

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
 if (p_confirm or d.status='confirmed') and (total=0 or (total<40 and not p_incomplete)) then raise exception 'Mark the memory incomplete if fewer than 40 main-deck cards are recorded.'; end if;
 update public.event_decks set title=trim(p_title),note=p_note,cards=p_cards,categories=p_categories,decisions=p_decisions,
 incomplete=p_incomplete,status=case when p_confirm or d.status='confirmed' then 'confirmed' else 'pending' end,
 revision=revision+1,updated_at=now() where id=p_id returning revision into result;
 delete from public.event_deck_cards where event_deck_id=p_id;
 insert into public.event_deck_cards(event_deck_id,name,count,oracle_id,scryfall_id,image_url,flagged,manually_edited,sources,allocations)
 select p_id,v->>'name',(v->>'count')::integer,v->>'oracleId',v->>'printingId',v->>'imageUrl',
 not coalesce((v->>'verified')::boolean,false),coalesce((v->>'edited')::boolean,false),coalesce(v->'sources','[]'::jsonb),coalesce(v->'allocations','[]'::jsonb)
 from jsonb_array_elements(p_cards) v;
 return result;
end $$;

-- Legacy callers can edit legacy decks; they cannot erase organization they cannot represent.
create or replace function public.save_deck_memory(p_id uuid,p_revision integer,p_title text,p_note text,p_cards jsonb,p_decisions jsonb,p_confirm boolean,p_incomplete boolean,p_acknowledged boolean) returns integer
language plpgsql security definer set search_path='' as $$
declare d public.event_decks;
begin
 select * into d from public.event_decks where id=p_id for update;
 if d.id is null or not public.owns_deck_memory(p_id) then raise exception 'You can only edit your own deck.'; end if;
 if d.categories<>'[]'::jsonb or exists(select 1 from jsonb_array_elements(d.cards) v where coalesce(v->'allocations','[]'::jsonb)<>'[]'::jsonb)
 or exists(select 1 from jsonb_array_elements(p_cards) v where coalesce(v->'allocations','[]'::jsonb)<>'[]'::jsonb) then raise exception 'Reload the updated deck editor before saving categories.'; end if;
 return public.save_deck_memory(p_id,p_revision,p_title,p_note,p_cards,p_decisions,p_confirm,p_incomplete,p_acknowledged,'[]'::jsonb);
end $$;
revoke all on function public.save_deck_memory(uuid,integer,text,text,jsonb,jsonb,boolean,boolean,boolean,jsonb) from public,anon;
grant execute on function public.save_deck_memory(uuid,integer,text,text,jsonb,jsonb,boolean,boolean,boolean,jsonb) to authenticated;
revoke all on function public.save_deck_memory(uuid,integer,text,text,jsonb,jsonb,boolean,boolean,boolean) from public,anon;
grant execute on function public.save_deck_memory(uuid,integer,text,text,jsonb,jsonb,boolean,boolean,boolean) to authenticated;
commit;
