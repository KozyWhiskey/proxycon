-- Additive, read-only history retrieval. Existing RLS stays authoritative.
begin;
create or replace function public.weekend_history_page(
 p_event uuid, p_limit integer default 20, p_day text default 'all', p_player text default 'all',
 p_format text default 'all', p_tournament text default 'all', p_search text default ''
) returns jsonb language sql stable security invoker set search_path='' as $$
 with member_names as materialized (
   select em.profile_id, coalesce(nullif(p.display_name,''),nullif(p.username,''),'Player') name
   from public.event_members em left join public.profiles p on p.id=em.profile_id where em.event_id=p_event
 ), completed as materialized (
   select m.*, coalesce(m.played_on::text,(m.created_at at time zone 'UTC')::date::text) result_day,
     coalesce(nullif(t.name,''),nullif(m.format_label,''),m.game_type)||' '||s.names search_text, s.profile_ids
   from public.matches m
   left join public.tournaments t on t.id=m.tournament_id and (t.is_archived=false or t.is_archived is null)
   join lateral (
     select bool_and(mp.result is not null and mp.result<>'') done, count(*) n,
       string_agg(coalesce(mn.name,'Player'),' ' order by mp.created_at,mp.id) names,
       array_agg(mp.profile_id::text) profile_ids
     from public.match_participants mp left join member_names mn on mn.profile_id=mp.profile_id where mp.match_id=m.id
   ) s on s.n>0 and s.done
   where auth.uid() is not null and m.event_id=p_event
 ), filtered as materialized (
   select * from completed m where
     (p_day='all' or m.result_day=p_day) and
     (p_player='all' or p_player=any(m.profile_ids)) and
     (p_tournament='all' or m.tournament_id::text=p_tournament) and
     (p_format='all' or case when p_format='tournament' then m.tournament_id is not null
       when m.tournament_id is not null then false
       when p_format='commander' then m.game_type in ('commander','commander_15','commander_30','cedh','planechase','archenemy')
       when p_format='team' then m.game_type in ('two_headed_giant','emperor','star')
       else m.game_type not in ('commander','commander_15','commander_30','cedh','planechase','archenemy','two_headed_giant','emperor','star') end) and
     (btrim(p_search)='' or strpos(lower(m.search_text),lower(btrim(p_search)))>0)
 ), page as materialized (
   select * from filtered order by coalesce(completed_at,created_at) desc,id desc limit greatest(20,least(1000,p_limit))
 ) select jsonb_build_object(
   'total',(select count(*) from filtered),
   'days',coalesce((select jsonb_agg(history_day order by history_day) from (select distinct result_day as history_day from completed) d),'[]'::jsonb),
   'matches',coalesce((select jsonb_agg(jsonb_build_object(
     'id',id,'tournament_id',tournament_id,'round_number',round_number,'table_number',table_number,'table_label',table_label,
     'game_type',game_type,'format_label',format_label,'started_at',started_at,'completed_at',completed_at,'played_on',played_on,
     'is_final',is_final,'is_rematch',is_rematch,'created_at',created_at
   ) order by coalesce(completed_at,created_at) desc,id desc) from page),'[]'::jsonb),
   'seats',coalesce((select jsonb_agg(jsonb_build_object(
     'id',mp.id,'match_id',mp.match_id,'profile_id',mp.profile_id,'participant_id',mp.participant_id,'result',mp.result,
     'games_won',mp.games_won,'deck_id',mp.deck_id,'team',mp.team,'seat_number',mp.seat_number,'finish_order',mp.finish_order
   ) order by mp.created_at,mp.id) from public.match_participants mp join page on page.id=mp.match_id),'[]'::jsonb)
 );
$$;
revoke all on function public.weekend_history_page(uuid,integer,text,text,text,text,text) from public,anon;
grant execute on function public.weekend_history_page(uuid,integer,text,text,text,text,text) to authenticated;
commit;
