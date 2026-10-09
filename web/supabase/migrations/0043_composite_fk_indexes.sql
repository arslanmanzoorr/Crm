-- 0042 indexed only the first column of each foreign key. The same-org keys are composite (x_id, org_id),
-- so they need an index whose leading columns are exactly the key's columns. Then drop the single-column
-- "_fk" indexes those new ones make redundant.
do $$
declare r record; n int;
begin
  for r in
    select c.conrelid as rel, c.conrelid::regclass as tbl, c.conname, c.conkey
    from pg_constraint c
    where c.contype = 'f' and c.connamespace = 'public'::regnamespace
  loop
    n := array_length(r.conkey, 1);
    if not exists (
      select 1 from pg_index i
      where i.indrelid = r.rel
        and (select array_agg(k order by k) from unnest((i.indkey::int2[])[0:n - 1]) k)
          = (select array_agg(k order by k) from unnest(r.conkey) k)
    ) then
      execute format('create index if not exists %I on %s (%s)', left(r.conname || '_idx', 63), r.tbl,
        (select string_agg(quote_ident(a.attname), ', ' order by u.ord)
         from unnest(r.conkey) with ordinality u(k, ord)
         join pg_attribute a on a.attrelid = r.rel and a.attnum = u.k));
    end if;
  end loop;

  for r in
    select ic.relname, i.indrelid as rel, i.indkey[0] as col
    from pg_index i join pg_class ic on ic.oid = i.indexrelid
    where ic.relnamespace = 'public'::regnamespace and ic.relname like '%\_fk'
      and i.indnatts = 1 and not i.indisunique
  loop
    if exists (select 1 from pg_index o where o.indrelid = r.rel and o.indnatts > 1 and o.indkey[0] = r.col) then
      execute format('drop index public.%I', r.relname);
    end if;
  end loop;
end $$;
