-- Agency mode, phases 2 and 3: staff invites, the agency's own branded app domain and logo, and billing control
-- per sub-account (price, status, and a pause that locks client users out until it's resumed).

-- ---------- Staff invites ----------
create table public.agency_invites (
  id uuid primary key default gen_random_uuid(), -- the token in the invite link
  agency_id uuid not null references public.agencies on delete cascade,
  email text not null check (email = lower(email) and length(email) <= 320 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  invited_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz
);
create unique index agency_invites_open on public.agency_invites (agency_id, email) where accepted_at is null;
alter table public.agency_invites enable row level security;
create policy "staff read invites" on public.agency_invites for select to authenticated using (private.agency_role(agency_id) is not null);
create policy "owners cancel invites" on public.agency_invites for delete to authenticated using (private.agency_role(agency_id) = 'owner');
revoke insert, update on public.agency_invites from anon, authenticated;

create function public.agency_invite(p_agency uuid, p_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_email text := lower(btrim(p_email));
begin
  if private.agency_role(p_agency) is distinct from 'owner' then raise exception 'not allowed'; end if;
  if (select count(*) from public.agency_members where agency_id = p_agency) >= 50 then raise exception 'limit'; end if;
  delete from public.agency_invites where agency_id = p_agency and email = v_email and accepted_at is null;
  insert into public.agency_invites (agency_id, email) values (p_agency, v_email) returning id into v_id;
  return v_id;
end $$;

create function public.accept_agency_invite(p_token uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare i public.agency_invites; v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then return 'signin'; end if;
  select * into i from public.agency_invites where id = p_token for update;
  if i.id is null then return 'invalid'; end if;
  if i.accepted_at is not null then return 'used'; end if;
  if i.expires_at < now() then return 'expired'; end if;
  if i.email <> v_email then return 'wrong_email'; end if;
  insert into public.agency_members (agency_id, user_id, role, email) values (i.agency_id, auth.uid(), 'admin', v_email)
    on conflict (agency_id, user_id) do nothing;
  update public.agency_invites set accepted_at = now() where id = i.id;
  return 'ok';
end $$;

-- Owners remove staff (never an owner); anyone can leave. Their sub-account access goes with them (trigger in 0079).
create function public.agency_remove_staff(p_agency uuid, p_user uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not (p_user = auth.uid() or private.agency_role(p_agency) = 'owner') then return false; end if;
  if (select role from public.agency_members where agency_id = p_agency and user_id = p_user) = 'owner' then return false; end if;
  delete from public.agency_members where agency_id = p_agency and user_id = p_user;
  return found;
end $$;

-- ---------- Branded app domain and logo ----------
alter table public.agencies
  add column logo_path text check (logo_path ~ '^agency/[0-9a-f-]{36}/logo-[0-9a-f]{8}\.(png|jpg|webp)$' and split_part(logo_path, '/', 2) = id::text),
  add column app_domain text check (length(app_domain) <= 253 and app_domain ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$'),
  add column domain_verified boolean not null default false;
create unique index agencies_verified_domain on public.agencies (app_domain) where domain_verified;
grant update (logo_path, app_domain) on public.agencies to authenticated;

create function private.reset_agency_domain() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.app_domain is distinct from old.app_domain then new.domain_verified := false; end if;
  return new;
end $$;
create trigger agencies_reset_domain before update of app_domain on public.agencies for each row execute function private.reset_agency_domain();

-- A team domain and an agency domain can't be the same address.
create function private.domain_free(p_domain text) returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.organizations where custom_domain = p_domain and domain_verified)
     and not exists (select 1 from public.agencies where app_domain = p_domain and domain_verified)
$$;

-- Agency logos live in the public brand-logos bucket under agency/<agency id>/; owners and admins write there.
create function private.can_brand_agency(path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select split_part(path, '/', 1) = 'agency' and private.agency_role(private.as_uuid(split_part(path, '/', 2))) in ('owner', 'admin')
$$;
grant execute on function private.can_brand_agency(text) to authenticated;
create policy "agency uploads logo" on storage.objects for insert to authenticated with check (bucket_id = 'brand-logos' and private.can_brand_agency(name));
create policy "agency reads logo" on storage.objects for select to authenticated using (bucket_id = 'brand-logos' and private.can_brand_agency(name));
create policy "agency deletes logo" on storage.objects for delete to authenticated using (bucket_id = 'brand-logos' and private.can_brand_agency(name));

-- Public: the branding for a verified agency domain (sign-in page, app title). Name, color and logo only.
create function public.agency_domain_brand(p_host text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('name', a.name, 'color', a.brand_color, 'logo', a.logo_path)
  from public.agencies a where a.domain_verified and a.app_domain = lower(p_host)
$$;
revoke execute on function public.agency_domain_brand(text) from public;
grant execute on function public.agency_domain_brand(text) to anon, authenticated;

-- ---------- Billing control ----------
alter table public.organizations
  add column billing_status text not null default 'active' check (billing_status in ('trial', 'active', 'past_due', 'paused')),
  add column billing_price numeric(10, 2) check (billing_price between 0 and 100000),
  add column billing_note text not null default '' check (length(billing_note) <= 300);

create function public.agency_set_billing(p_org uuid, p_status text, p_price numeric, p_note text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if private.agency_role((select agency_id from public.organizations where id = p_org)) is distinct from 'owner'
     and private.agency_role((select agency_id from public.organizations where id = p_org)) is distinct from 'admin' then return false; end if;
  update public.organizations set billing_status = p_status, billing_price = p_price, billing_note = left(coalesce(p_note, ''), 300) where id = p_org;
  return true;
end $$;

-- A paused sub-account: its own users get no team data (agency staff still can, to fix things or export).
-- Enforced where every policy looks: the active org and membership checks.
create or replace function private.my_org() returns uuid
language sql stable security definer set search_path = '' as $$
  select m.org_id from public.memberships m
  join public.organizations o on o.id = m.org_id
  left join public.profiles p on p.user_id = m.user_id
  where m.user_id = auth.uid() and private.mfa_ok() and (o.billing_status <> 'paused' or m.via_agency)
  order by (m.org_id = p.active_org_id) desc nulls last, m.created_at, m.org_id
  limit 1
$$;

create or replace function private.is_member(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.mfa_ok() and exists (
    select 1 from public.memberships m join public.organizations o on o.id = m.org_id
    where m.org_id = org and m.user_id = auth.uid() and (o.billing_status <> 'paused' or m.via_agency))
$$;

create or replace function private.member_of_folder(path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m join public.organizations o on o.id = m.org_id
    where m.user_id = auth.uid() and m.org_id::text = split_part(path, '/', 1) and (o.billing_status <> 'paused' or m.via_agency)
  )
$$;

-- Shown instead of the app when someone's only access is a paused sub-account.
create function public.paused_notice() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('team', o.name, 'agency', a.name)
  from public.memberships m join public.organizations o on o.id = m.org_id left join public.agencies a on a.id = o.agency_id
  where m.user_id = auth.uid() and o.billing_status = 'paused' and not m.via_agency
  limit 1
$$;

revoke execute on function public.agency_invite(uuid, text), public.accept_agency_invite(uuid), public.agency_remove_staff(uuid, uuid),
  public.agency_set_billing(uuid, text, numeric, text), public.paused_notice() from public, anon;
grant execute on function public.agency_invite(uuid, text), public.accept_agency_invite(uuid), public.agency_remove_staff(uuid, uuid),
  public.agency_set_billing(uuid, text, numeric, text), public.paused_notice() to authenticated;
revoke execute on function private.domain_free(text) from public, anon, authenticated;

-- Overview gains billing; app_brand gains the agency logo fallback and its name for branded domains.
create or replace function public.agency_overview(p_agency uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when private.agency_role(p_agency) is null then null else coalesce((select jsonb_agg(r order by r.name) from (
    select o.id, o.name, o.created_at, o.billing_status, o.billing_price, o.billing_note,
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

create or replace function public.app_brand() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('color', coalesce(o.brand_color, a.brand_color), 'radius', o.button_radius, 'logo', coalesce(o.logo_path, a.logo_path),
    'off', to_jsonb(o.disabled_features),
    'name', o.name, 'theme', coalesce((select p.theme from public.user_prefs p where p.user_id = auth.uid()), o.theme),
    'domain', case when o.domain_verified then o.custom_domain end,
    'tour', coalesce((select p.tour from public.user_prefs p where p.user_id = auth.uid()), '{}'::jsonb),
    'role', (select private.my_role()),
    'agency', (select jsonb_build_object('id', ag.id, 'name', ag.name) from public.agency_members am join public.agencies ag on ag.id = am.agency_id
               where am.user_id = auth.uid() order by am.created_at limit 1),
    'via_agency', (select m.via_agency from public.memberships m where m.org_id = o.id and m.user_id = auth.uid()),
    'product', case when a.domain_verified then a.name end)
  from public.organizations o left join public.agencies a on a.id = o.agency_id where o.id = (select private.my_org())
$$;
