-- Listing funnel gains showings (showing-to-offer conversion, feature 122).
do $$
declare src text;
begin
  select pg_get_functiondef('public.team_analytics(int)'::regprocedure) into src;
  src := replace(src,
    '(select count(*) from public.offers o where o.property_id = p.id and o.side = ''seller'') as offers,',
    '(select count(*) from public.showings s where s.property_id = p.id and s.status in (''confirmed'', ''done'')) as showings,
               (select count(*) from public.offers o where o.property_id = p.id and o.side = ''seller'') as offers,');
  if position('as showings' in src) = 0 then raise exception 'team_analytics: listing funnel pattern not found'; end if;
  execute src;
end $$;
