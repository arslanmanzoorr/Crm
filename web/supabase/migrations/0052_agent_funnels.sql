-- Team conversion funnels: each agent's leads in the period, and how many were contacted, qualified and went
-- under contract (same definitions as the lead-source table).
do $$
declare
  src text := pg_get_functiondef('public.team_analytics(integer)'::regprocedure);
  old text := $r$(select count(*) from leads l where l.owner_id = m.user_id) as leads,$r$;
begin
  if position(old in src) = 0 then raise exception 'pattern not found'; end if;
  execute replace(src, old, old || $r$
               (select count(*) from leads l where l.owner_id = m.user_id and l.first_response_at is not null) as reached,
               (select count(*) from leads l where l.owner_id = m.user_id and l.stage in ('Qualified', 'Showing', 'Offer', 'Under Contract', 'Closed')) as qualified,
               (select count(*) from leads l where l.owner_id = m.user_id and l.contracted) as contracted,$r$);
end $$;
