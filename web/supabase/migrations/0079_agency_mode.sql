-- Agency mode: an agency (coach, brokerage, reseller) runs many sub-accounts. Each sub-account is an ordinary team
-- with its own data and branding. Agency staff work inside a sub-account through a normal membership flagged
-- via_agency, so every existing row policy applies unchanged. Snapshots copy a whole setup onto new sub-accounts.

create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 80),
  brand_color text check (brand_color ~ '^#[0-9a-f]{6}$'),
  created_at timestamptz not null default now()
);

create table public.agency_members (
  agency_id uuid not null references public.agencies on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  email text,
  created_at timestamptz not null default now(),
  primary key (agency_id, user_id)
);
create index on public.agency_members (user_id);

alter table public.organizations add column agency_id uuid references public.agencies on delete set null;
create index on public.organizations (agency_id);
alter table public.memberships add column via_agency boolean not null default false;

create table public.agency_snapshots (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 500000),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.agency_snapshots (agency_id);

-- Is the caller staff of this agency (optionally with one of these roles)?
create function private.agency_role(p_agency uuid) returns text
language sql stable security definer set search_path = '' as $$
  select role from public.agency_members where agency_id = p_agency and user_id = auth.uid() and private.mfa_ok()
$$;
grant execute on function private.agency_role(uuid) to authenticated;

alter table public.agencies enable row level security;
alter table public.agency_members enable row level security;
alter table public.agency_snapshots enable row level security;
create policy "staff read agency" on public.agencies for select to authenticated using (private.agency_role(id) is not null);
create policy "owner renames agency" on public.agencies for update to authenticated
  using (private.agency_role(id) in ('owner', 'admin')) with check (private.agency_role(id) in ('owner', 'admin'));
revoke update on public.agencies from anon, authenticated;
grant update (name, brand_color) on public.agencies to authenticated;
create policy "staff read staff" on public.agency_members for select to authenticated using (private.agency_role(agency_id) is not null);
create policy "staff read snapshots" on public.agency_snapshots for select to authenticated using (private.agency_role(agency_id) is not null);
create policy "staff delete snapshots" on public.agency_snapshots for delete to authenticated using (private.agency_role(agency_id) is not null);
revoke insert, update on public.agency_members, public.agency_snapshots from anon, authenticated;
revoke insert, delete on public.agencies from anon, authenticated;

-- Removing someone from the agency also removes the access they got through it.
create function private.drop_agency_access() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.memberships m using public.organizations o
  where m.org_id = o.id and o.agency_id = old.agency_id and m.user_id = old.user_id and m.via_agency;
  return old;
end $$;
create trigger agency_members_drop_access after delete on public.agency_members for each row execute function private.drop_agency_access();

-- Start an agency (the caller becomes its owner). A person can own at most 3.
create function public.create_agency(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null or not private.mfa_ok() then raise exception 'not allowed'; end if;
  if (select count(*) from public.agency_members where user_id = auth.uid() and role = 'owner') >= 3 then raise exception 'limit'; end if;
  insert into public.agencies (name) values (left(btrim(p_name), 80)) returning id into v_id;
  insert into public.agency_members (agency_id, user_id, role, email) values (v_id, auth.uid(), 'owner', lower(auth.jwt() ->> 'email'));
  return v_id;
end $$;

-- Join a sub-account as agency staff (agency owner -> owner, admin -> admin), out of lead rotation, and switch to it.
create function private.agency_join(p_org uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_role text := private.agency_role((select agency_id from public.organizations where id = p_org));
begin
  if v_role is null then return false; end if;
  insert into public.memberships (org_id, user_id, role, email, via_agency, in_rotation)
  values (p_org, auth.uid(), v_role, lower(auth.jwt() ->> 'email'), true, false)
  on conflict (org_id, user_id) do nothing;
  insert into public.profiles (user_id, active_org_id) values (auth.uid(), p_org)
    on conflict (user_id) do update set active_org_id = excluded.active_org_id;
  return true;
end $$;

create function public.agency_enter(p_org uuid) returns boolean
language sql security definer set search_path = '' as $$ select private.agency_join(p_org) $$;

-- A snapshot of one sub-account's setup: settings, automations and document templates. No client data.
create function private.snapshot_of(p_org uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'settings', (select jsonb_build_object('brand_color', o.brand_color, 'button_radius', o.button_radius, 'theme', o.theme,
        'disabled_features', o.disabled_features, 'home_order', o.home_order, 'home_hidden', o.home_hidden,
        'call_start', o.call_start, 'call_end', o.call_end, 'routing', o.routing, 'split_tiers', o.split_tiers,
        'hide_powered_by', o.hide_powered_by) from public.organizations o where o.id = p_org),
    'workflows', coalesce((select jsonb_agg(jsonb_build_object('name', w.name, 'trigger', w.trigger, 'conditions', w.conditions,
        'steps', w.steps, 'stop_stages', w.stop_stages, 'enabled', w.enabled, 'template', w.template)) from public.workflows w where w.org_id = p_org), '[]'),
    'doc_templates', coalesce((select jsonb_agg(jsonb_build_object('name', t.name, 'state', t.state, 'body', t.body))
        from public.doc_templates t where t.org_id = p_org), '[]'))
$$;

create function public.agency_snapshot_save(p_org uuid, p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_agency uuid := (select agency_id from public.organizations where id = p_org); v_id uuid;
begin
  if private.agency_role(v_agency) is null then raise exception 'not allowed'; end if;
  if (select count(*) from public.agency_snapshots where agency_id = v_agency) >= 50 then raise exception 'limit'; end if;
  insert into public.agency_snapshots (agency_id, name, data) values (v_agency, left(btrim(p_name), 80), private.snapshot_of(p_org)) returning id into v_id;
  return v_id;
end $$;

-- Apply a snapshot to a sub-account of the same agency: settings replaced, automations and templates added
-- (skipping names the sub-account already has).
create function private.snapshot_apply(p_snapshot uuid, p_org uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare s jsonb; v_agency uuid := (select agency_id from public.organizations where id = p_org); x jsonb;
begin
  select data into s from public.agency_snapshots where id = p_snapshot and agency_id = v_agency;
  if s is null then raise exception 'snapshot not found'; end if;
  update public.organizations set
    brand_color = s->'settings'->>'brand_color', button_radius = coalesce(s->'settings'->>'button_radius', 'pill'),
    theme = coalesce(s->'settings'->>'theme', 'dark'),
    disabled_features = coalesce(array(select jsonb_array_elements_text(s->'settings'->'disabled_features')), '{}'),
    home_order = coalesce(array(select jsonb_array_elements_text(s->'settings'->'home_order')), '{}'),
    home_hidden = coalesce(array(select jsonb_array_elements_text(s->'settings'->'home_hidden')), '{}'),
    call_start = coalesce((s->'settings'->>'call_start')::int, call_start), call_end = coalesce((s->'settings'->>'call_end')::int, call_end),
    routing = coalesce(s->'settings'->>'routing', routing), split_tiers = coalesce(s->'settings'->'split_tiers', split_tiers),
    hide_powered_by = coalesce((s->'settings'->>'hide_powered_by')::boolean, hide_powered_by)
  where id = p_org;
  for x in select * from jsonb_array_elements(s->'workflows') loop
    if not exists (select 1 from public.workflows where org_id = p_org and name = x->>'name') then
      insert into public.workflows (org_id, name, trigger, conditions, steps, stop_stages, enabled, template)
      values (p_org, x->>'name', x->>'trigger', coalesce(x->'conditions', '{}'), x->'steps',
              coalesce(array(select jsonb_array_elements_text(x->'stop_stages')), '{Lost}'), coalesce((x->>'enabled')::boolean, true), x->>'template');
    end if;
  end loop;
  for x in select * from jsonb_array_elements(s->'doc_templates') loop
    if not exists (select 1 from public.doc_templates where org_id = p_org and name = x->>'name') then
      insert into public.doc_templates (org_id, name, state, body) values (p_org, x->>'name', x->>'state', x->>'body');
    end if;
  end loop;
end $$;

create function public.agency_snapshot_apply(p_snapshot uuid, p_org uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if private.agency_role((select agency_id from public.organizations where id = p_org)) is null then return false; end if;
  perform private.snapshot_apply(p_snapshot, p_org);
  return true;
end $$;

-- New sub-account: created inside the agency, the caller joins it as agency staff, optional snapshot applied.
create function public.agency_create_subaccount(p_agency uuid, p_name text, p_snapshot uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  if private.agency_role(p_agency) is null then raise exception 'not allowed'; end if;
  if (select count(*) from public.organizations where agency_id = p_agency) >= 500 then raise exception 'limit'; end if;
  insert into public.organizations (name, agency_id) values (left(btrim(p_name), 80), p_agency) returning id into v_org;
  insert into public.lead_forms (org_id) values (v_org);
  perform private.agency_join(v_org);
  if p_snapshot is not null then perform private.snapshot_apply(p_snapshot, v_org); end if;
  return v_org;
end $$;

-- Agency dashboard: each sub-account's health over the last 30 days. Counts only, no client details.
create function public.agency_overview(p_agency uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when private.agency_role(p_agency) is null then null else coalesce((select jsonb_agg(r order by r.name) from (
    select o.id, o.name, o.created_at,
      (select count(*) from public.memberships m where m.org_id = o.id and not m.via_agency) as users,
      (select count(*) from public.contacts c where c.org_id = o.id and c.created_at > now() - interval '30 days' and not c.is_sample) as leads_30d,
      (select count(*) from public.contacts c where c.org_id = o.id and c.inbound and c.created_at > now() - interval '30 days') as inbound_30d,
      (select count(*) from public.contacts c where c.org_id = o.id and c.inbound and c.first_response_at is null
         and c.created_at between now() - interval '30 days' and now() - interval '1 hour') as unanswered_30d,
      (select round((percentile_cont(0.5) within group (order by extract(epoch from (c.first_response_at - c.created_at)) / 60))::numeric, 1)
         from public.contacts c where c.org_id = o.id and c.inbound and c.first_response_at is not null and c.created_at > now() - interval '30 days') as median_response_min,
      (select count(*) from public.deals d where d.org_id = o.id and d.status = 'active') as active_deals,
      (select count(*) from public.deals d where d.org_id = o.id and d.status = 'closed' and d.closed_at > now() - interval '30 days') as closed_30d,
      (select max(a.ts) from public.activities a where a.org_id = o.id) as last_activity
    from public.organizations o where o.agency_id = p_agency) r), '[]'::jsonb) end
$$;

revoke execute on function public.create_agency(text), public.agency_enter(uuid), public.agency_snapshot_save(uuid, text),
  public.agency_snapshot_apply(uuid, uuid), public.agency_create_subaccount(uuid, text, uuid), public.agency_overview(uuid) from public, anon;
grant execute on function public.create_agency(text), public.agency_enter(uuid), public.agency_snapshot_save(uuid, text),
  public.agency_snapshot_apply(uuid, uuid), public.agency_create_subaccount(uuid, text, uuid), public.agency_overview(uuid) to authenticated;
revoke execute on function private.agency_join(uuid), private.snapshot_of(uuid), private.snapshot_apply(uuid, uuid) from public, anon, authenticated;

-- App shell: also the agency this person staffs (for the Agency link) and the sub-account's agency (for the
-- "viewing as agency" bar). A sub-account without its own color inherits the agency's.
create or replace function public.app_brand() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('color', coalesce(o.brand_color, a.brand_color), 'radius', o.button_radius, 'logo', o.logo_path, 'off', to_jsonb(o.disabled_features),
    'name', o.name, 'theme', coalesce((select p.theme from public.user_prefs p where p.user_id = auth.uid()), o.theme),
    'domain', case when o.domain_verified then o.custom_domain end,
    'tour', coalesce((select p.tour from public.user_prefs p where p.user_id = auth.uid()), '{}'::jsonb),
    'role', (select private.my_role()),
    'agency', (select jsonb_build_object('id', ag.id, 'name', ag.name) from public.agency_members am join public.agencies ag on ag.id = am.agency_id
               where am.user_id = auth.uid() order by am.created_at limit 1),
    'via_agency', (select m.via_agency from public.memberships m where m.org_id = o.id and m.user_id = auth.uid()))
  from public.organizations o left join public.agencies a on a.id = o.agency_id where o.id = (select private.my_org())
$$;
