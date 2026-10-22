create unique index if not exists matches_tournament_round_table
  on public.matches (tournament_id, round_number, table_number)
  where tournament_id is not null
    and round_number is not null
    and table_number is not null
    and is_final = false;
