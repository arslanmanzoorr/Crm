-- Performance advisor fixes.
-- 1. Every foreign key gets an index on its leading column (if none exists), so cascading deletes and joins
--    stay fast as tables grow. Generated from the catalog so nothing is missed.
do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tbl, a.attname as col, c.conrelid as rel, c.conkey[1] as attnum
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and c.connamespace = 'public'::regnamespace
  loop
    if not exists (select 1 from pg_index i where i.indrelid = r.rel and i.indkey[0] = r.attnum) then
      execute format('create index if not exists %I on %s (%I)', left(replace(r.tbl::text, 'public.', '') || '_' || r.col || '_fk', 63), r.tbl, r.col);
    end if;
  end loop;
end $$;

-- 2. One SELECT policy per table: "admins write" no longer also applies to reads.
drop policy "admins write" on territories;
create policy "admins insert" on territories for insert
  with check (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'));
create policy "admins update" on territories for update
  using (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'))
  with check (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'));
create policy "admins delete" on territories for delete
  using (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'));

drop policy "admins write" on workflows;
create policy "admins insert" on workflows for insert
  with check (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'));
create policy "admins update" on workflows for update
  using (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'))
  with check (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'));
create policy "admins delete" on workflows for delete
  using (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'));
