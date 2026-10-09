-- Territories: an area belongs to an agent. Unassigned new leads in that area go to them first;
-- everything else falls back to round-robin (when it's on).

create table territories (
  org_id uuid not null default private.my_org(),
  area text not null check (length(btrim(area)) between 1 and 80),
  area_key text generated always as (lower(btrim(area))) stored,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (org_id, area_key),
  foreign key (org_id, user_id) references memberships (org_id, user_id) on delete cascade
);
alter table territories enable row level security;
create policy "members read" on territories for select using (org_id = (select private.my_org()));
create policy "admins write" on territories for all
  using (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'))
  with check (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'));

create or replace function private.route_lead() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  if new.owner_id is not null then return new; end if;

  -- 1. Territory: the first of the lead's areas that someone owns.
  select t.user_id into v_user
  from unnest(new.areas) with ordinality as a(area, i)
  join public.territories t on t.org_id = new.org_id and t.area_key = lower(btrim(a.area))
  order by a.i limit 1;
  if v_user is not null then
    new.owner_id := v_user;
    return new;
  end if;

  -- 2. Round-robin among agents in rotation.
  if (select routing from public.organizations where id = new.org_id) <> 'round_robin' then return new; end if;
  select user_id into v_user from public.memberships
  where org_id = new.org_id and in_rotation and role <> 'assistant'
  order by last_assigned_at nulls first, created_at
  limit 1 for update skip locked;
  if v_user is not null then
    new.owner_id := v_user;
    update public.memberships set last_assigned_at = now() where org_id = new.org_id and user_id = v_user;
  end if;
  return new;
end $$;
