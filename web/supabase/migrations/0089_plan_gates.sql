-- Plans are enforced where settings are read, not only where they are changed: a team that moves to a lower plan keeps
-- its saved settings, but they stop taking effect (and come back if it moves up again).
--   Team: white-label (colors, logo, button shape, custom domain, no "Powered by") and lead routing (territories, round robin).
--   Pro and Team: sending email (newsletters and drip steps). Queued email from a Starter team is skipped, not sent.

create or replace function public.app_brand() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'color', case when o.plan = 'team' then coalesce(o.brand_color, a.brand_color) end,
    'radius', case when o.plan = 'team' then o.button_radius else 'pill' end,
    'logo', case when o.plan = 'team' then coalesce(o.logo_path, a.logo_path) end,
    'off', to_jsonb(o.disabled_features),
    'name', o.name, 'theme', coalesce((select p.theme from public.user_prefs p where p.user_id = auth.uid()), o.theme),
    'domain', case when o.domain_verified and o.plan = 'team' then o.custom_domain end,
    'tour', coalesce((select p.tour from public.user_prefs p where p.user_id = auth.uid()), '{}'::jsonb),
    'role', (select private.my_role()),
    'agency', (select jsonb_build_object('id', ag.id, 'name', ag.name) from public.agency_members am join public.agencies ag on ag.id = am.agency_id
               where am.user_id = auth.uid() order by am.created_at limit 1),
    'via_agency', (select m.via_agency from public.memberships m where m.org_id = o.id and m.user_id = auth.uid()),
    'product', case when a.domain_verified then a.name end,
    'plan', o.plan, 'plan_interval', o.plan_interval)
  from public.organizations o left join public.agencies a on a.id = o.agency_id where o.id = (select private.my_org())
$$;

create or replace function public.public_brand(p_kind text, p_id text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('color', case when o.plan = 'team' then o.brand_color end, 'hide', o.plan = 'team' and o.hide_powered_by)
  from public.organizations o
  where o.id = case p_kind
    when 'form' then (select f.org_id from public.lead_forms f where f.id = private.as_uuid(p_id))
    when 'oh' then (select h.org_id from public.open_houses h where h.id = private.as_uuid(p_id))
    when 'portal' then (select l.org_id from private.portal_link(p_id) l)
  end
$$;

create or replace function public.domain_allows(p_host text, p_kind text, p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organizations o
    where o.domain_verified and o.plan = 'team' and o.custom_domain = lower(p_host)
      and o.id = case p_kind
        when 'form' then (select f.org_id from public.lead_forms f where f.id = private.as_uuid(p_id))
        when 'oh' then (select h.org_id from public.open_houses h where h.id = private.as_uuid(p_id))
        when 'portal' then (select l.org_id from private.portal_link(p_id) l)
      end
  )
$$;

create or replace function private.route_lead() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_mode text;
begin
  if new.owner_id is not null then return new; end if;
  if (select plan from public.organizations where id = new.org_id) <> 'team' then return new; end if; -- routing is a Team feature

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
end $$;

create or replace function public.email_claim(p_secret text, p_limit integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  if not private.dispatch_ok(p_secret) then raise exception 'not allowed'; end if;
  -- Sending email is a Pro feature: a Starter team's queued email is skipped with a reason, never sent later by surprise.
  update public.email_messages m set status = 'skipped', error = 'Email sending is part of the Pro plan.'
  where m.status = 'queued' and exists (select 1 from public.organizations o where o.id = m.org_id and o.plan = 'starter');
  with claimed as (
    update public.email_messages m set status = 'sending'
    where m.id in (select id from public.email_messages where status = 'queued' order by created_at limit least(greatest(p_limit, 1), 1000) for update skip locked)
    returning m.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id, 'org_id', m.org_id, 'contact_id', m.contact_id, 'campaign_id', m.campaign_id, 'to_email', m.to_email, 'attempts', m.attempts,
    'subject', coalesce(cp.subject, m.subject), 'preheader', coalesce(cp.preheader, ''), 'body', coalesce(cp.body, m.body),
    'name', c.name, 'eligible', (c.consent_email and lower(c.email) = m.to_email and not c.is_sample
       and not exists (select 1 from public.suppressions s where s.org_id = m.org_id and s.kind = 'email' and s.value = m.to_email)),
    'team', o.name,
    'color', case when o.plan = 'team' then coalesce(o.brand_color, a.brand_color) end,
    'logo', case when o.plan = 'team' then coalesce(o.logo_path, a.logo_path) end,
    'from_name', o.email_from_name, 'from_address', o.email_from_address, 'reply_to', o.email_reply_to, 'postal', o.email_postal_address)), '[]'::jsonb)
  into v
  from claimed m
  join public.contacts c on c.id = m.contact_id
  join public.organizations o on o.id = m.org_id
  left join public.agencies a on a.id = o.agency_id
  left join public.campaigns cp on cp.id = m.campaign_id;
  return v;
end $$;
