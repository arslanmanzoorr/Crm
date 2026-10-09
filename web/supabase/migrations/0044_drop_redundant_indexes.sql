-- Last uncovered key (0043 saw (org_id, property_id) as covering; the advisor wants the key's own order),
-- then drop every single-column index that is just the leading column of a wider one.
create index offers_property_id_org_id_fkey_idx on offers (property_id, org_id);

do $$
declare r record;
begin
  for r in
    select ic.relname from pg_index i join pg_class ic on ic.oid = i.indexrelid
    where ic.relnamespace = 'public'::regnamespace and i.indnatts = 1 and not i.indisunique and not i.indisprimary
      and exists (select 1 from pg_index o where o.indrelid = i.indrelid and o.indnatts > 1 and o.indkey[0] = i.indkey[0])
  loop
    execute format('drop index public.%I', r.relname);
  end loop;
end $$;
