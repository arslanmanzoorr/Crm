-- Lead sources gain marketing spend for the period (cost per lead / per closing, features 25 and 233).
do $$
declare src text; out text;
begin
  select pg_get_functiondef('public.team_analytics(int)'::regprocedure) into src;
  out := regexp_replace(src, 'as median_response_min(\s+)from leads group by source',
    'as median_response_min, (select coalesce(sum(e.amount), 0) from public.expenses e, win w2 where e.source = leads.source and e.spent_on >= w2.since::date) as spend\1from leads group by source');
  if out = src then raise exception 'team_analytics: by_source pattern not found'; end if;
  execute out;
end $$;
