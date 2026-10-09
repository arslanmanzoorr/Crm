-- Client portal: homes carry their virtual tour link.
do $$
declare src text; out text;
begin
  select pg_get_functiondef('public.portal_view(text)'::regprocedure) into src;
  out := replace(src, '''status'', p.status, ''features'', p.features))', '''status'', p.status, ''features'', p.features, ''tour_url'', p.tour_url))');
  if out = src then raise exception 'portal_view: listings pattern not found'; end if;
  execute out;
end $$;
