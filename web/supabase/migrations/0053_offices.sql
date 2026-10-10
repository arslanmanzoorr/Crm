-- Offices (multi-office brokerages): admins create them and place members; analytics and the team pipeline
-- can be read per office.

create table offices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default private.my_org() references organizations on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  created_at timestamptz not null default now(),
  unique (id, org_id),
  unique (org_id, name)
);
alter table offices enable row level security;
create policy "members read" on offices for select using (org_id = (select private.my_org()));
create policy "admins insert" on offices for insert
  with check (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'));
create policy "admins update" on offices for update
  using (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'))
  with check (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'));
create policy "admins delete" on offices for delete
  using (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'));

alter table memberships add column office_id uuid;
alter table memberships add foreign key (office_id, org_id) references offices (id, org_id) on delete set null (office_id);
create index on memberships (office_id, org_id);

-- Owners and admins place a member in an office (or none). The foreign key keeps it inside the team.
create function public.set_office(p_user uuid, p_office uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if private.my_role() not in ('owner', 'admin') then return false; end if;
  update public.memberships set office_id = p_office where org_id = private.my_org() and user_id = p_user;
  return found;
end $$;
revoke execute on function public.set_office(uuid, uuid) from public, anon;
grant execute on function public.set_office(uuid, uuid) to authenticated;

-- Analytics agent rows carry their office.
do $$
declare src text := pg_get_functiondef('public.team_analytics(integer)'::regprocedure);
begin
  if position('select m.user_id, m.email, m.role,' in src) = 0 then raise exception 'pattern not found'; end if;
  execute replace(src, 'select m.user_id, m.email, m.role,', 'select m.user_id, m.email, m.role, m.office_id,');
end $$;
