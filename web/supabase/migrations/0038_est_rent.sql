-- Estimated monthly rent on listings (for investor matching and rental numbers); the client portal gets it too.
alter table properties add column est_rent numeric check (est_rent is null or (est_rent > 0 and est_rent < 1e7));

do $$
declare src text; out text;
begin
  select pg_get_functiondef('public.portal_view(text)'::regprocedure) into src;
  out := replace(src, '''tour_url'', p.tour_url))', '''tour_url'', p.tour_url, ''est_rent'', p.est_rent))');
  if out = src then raise exception 'portal_view: listings pattern not found'; end if;
  execute out;
end $$;
