-- Analytics: monthly lead cohorts (last 12 months, regardless of the period picker) and how far each got.
do $$
declare src text; out text;
begin
  select pg_get_functiondef('public.team_analytics(int)'::regprocedure) into src;
  out := replace(src, '''listings'', coalesce((select jsonb_agg(l order by l.days_on_market desc)',
    '''cohorts'', coalesce((select jsonb_agg(k order by k.month) from (
        select to_char(date_trunc(''month'', c.created_at), ''YYYY-MM'') as month, count(*) as leads,
               count(*) filter (where c.first_response_at is not null) as reached,
               count(*) filter (where c.stage in (''Qualified'', ''Showing'', ''Offer'', ''Under Contract'', ''Closed'')) as qualified,
               count(*) filter (where exists (select 1 from public.deals d where d.contact_id = c.id and d.status in (''active'', ''closed'')))  as contracted,
               count(*) filter (where exists (select 1 from public.deals d where d.contact_id = c.id and d.status = ''closed'')) as closed
        from public.contacts c where c.created_at >= date_trunc(''month'', now()) - interval ''11 months''
        group by 1) k), ''[]''),
    ''listings'', coalesce((select jsonb_agg(l order by l.days_on_market desc)');
  if out = src then raise exception 'team_analytics: listings key not found'; end if;
  execute out;
end $$;
