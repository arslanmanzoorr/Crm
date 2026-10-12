-- Performance-based routing: like round-robin, but agents who reach their leads get more of them.
-- Weight = 0.5 + share of their last-90-day leads they contacted (0.5..1.5; 1.0 until they have 5 leads), so the
-- best responder gets up to 3x the slowest, and nobody in the rotation is starved. Next lead goes to whoever is
-- furthest below their weighted share of the last 14 days; ties go to whoever has waited longest.
alter table public.organizations drop constraint organizations_routing_check;
alter table public.organizations add constraint organizations_routing_check check (routing in ('off', 'round_robin', 'performance'));

create or replace function private.route_lead()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_user uuid; v_mode text;
begin
  if new.owner_id is not null then return new; end if;

  select t.user_id into v_user
  from unnest(new.areas) with ordinality as a(area, i)
  join public.territories t on t.org_id = new.org_id and t.area_key = lower(btrim(a.area))
  order by a.i limit 1;
  if v_user is not null then
    new.owner_id := v_user;
    return new;
  end if;

  select routing into v_mode from public.organizations where id = new.org_id;
  if v_mode = 'round_robin' then
    select user_id into v_user from public.memberships
    where org_id = new.org_id and in_rotation and role <> 'assistant'
    order by last_assigned_at nulls first, created_at
    limit 1 for update skip locked;
  elsif v_mode = 'performance' then
    select m.user_id into v_user
    from public.memberships m
    cross join lateral (
      select count(*) filter (where c.created_at >= now() - interval '14 days') as recent,
             count(*) as total, count(*) filter (where c.first_response_at is not null) as reached
      from public.contacts c
      where c.org_id = m.org_id and c.owner_id = m.user_id and c.created_at >= now() - interval '90 days'
    ) s
    where m.org_id = new.org_id and m.in_rotation and m.role <> 'assistant'
    order by s.recent / (case when s.total < 5 then 1.0 else 0.5 + s.reached::numeric / s.total end), m.last_assigned_at nulls first, m.created_at
    limit 1 for update of m skip locked;
  end if;
  if v_user is not null then
    new.owner_id := v_user;
    update public.memberships set last_assigned_at = now() where org_id = new.org_id and user_id = v_user;
  end if;
  return new;
end $function$;
