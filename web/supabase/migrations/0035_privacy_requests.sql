-- Consumer privacy requests (CCPA/CPRA and other state laws): access, delete, correct, opt out of sale/sharing.
-- Submitted on the team's public page (keyed RPC like submit_lead), tracked with the 45-day response deadline.

create table privacy_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  kind text not null check (kind in ('access', 'delete', 'correct', 'opt_out')),
  name text not null check (length(btrim(name)) between 1 and 200),
  email text check (email is null or length(email) <= 320),
  phone text check (phone is null or length(phone) <= 30),
  details text not null default '' check (length(details) <= 2000),
  state text check (state is null or state ~ '^[A-Z]{2}$'),
  status text not null default 'open' check (status in ('open', 'verifying', 'done', 'denied')),
  resolution text not null default '' check (length(resolution) <= 2000),
  ip_hash text not null,
  due_on date not null default (current_date + 45),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  check (email is not null or phone is not null)
);
create index on privacy_requests (org_id, status, due_on);
alter table privacy_requests enable row level security;
create policy "admins read" on privacy_requests for select
  using (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'));
create policy "admins update" on privacy_requests for update
  using (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'))
  with check (org_id = (select private.my_org()));

create function private.privacy_request_unkeyed(p_form uuid, p_ip_hash text, p_kind text, p_name text, p_email text, p_phone text, p_state text, p_details text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  f public.lead_forms;
  v_name text := left(btrim(regexp_replace(coalesce(p_name, ''), '[<>]', '', 'g')), 200);
  v_email text := nullif(lower(left(btrim(coalesce(p_email, '')), 320)), '');
  v_phone text := nullif(left(regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g'), 20), '');
  v_state text := nullif(upper(btrim(coalesce(p_state, ''))), '');
  v_owner uuid;
  v_id uuid;
begin
  select * into f from public.lead_forms where id = p_form;
  if f.id is null then return 'closed'; end if;   -- privacy requests are accepted even if the lead form is paused
  if p_kind not in ('access', 'delete', 'correct', 'opt_out') or length(v_name) = 0 or (v_email is null and v_phone is null) then return 'invalid'; end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return 'invalid'; end if;
  if v_state is not null and v_state !~ '^[A-Z]{2}$' then return 'invalid'; end if;
  if p_ip_hash is null or length(p_ip_hash) > 64 then return 'invalid'; end if;
  if (select count(*) from public.privacy_requests where ip_hash = p_ip_hash and created_at > now() - interval '1 day') >= 5 then return 'limited'; end if;

  insert into public.privacy_requests (org_id, kind, name, email, phone, state, details, ip_hash)
  values (f.org_id, p_kind, v_name, v_email, v_phone, v_state, left(btrim(coalesce(p_details, '')), 2000), p_ip_hash)
  returning id into v_id;

  select user_id into v_owner from public.memberships where org_id = f.org_id and role = 'owner' order by created_at limit 1;
  insert into public.tasks (org_id, contact_id, assignee_id, kind, title, note, due_at, created_by)
  values (f.org_id, null, v_owner, 'email',
          'Privacy request (' || replace(p_kind, '_', ' ') || ') from ' || v_name,
          'Verify who they are, then respond by ' || to_char(current_date + 45, 'Mon DD, YYYY') || '. Track it on the Account page.',
          now() + interval '2 days', 'system');
  return 'ok';
end $$;
revoke execute on function private.privacy_request_unkeyed(uuid, text, text, text, text, text, text, text) from public, anon, authenticated;

create function public.submit_privacy_request(p_key text, p_form uuid, p_ip_hash text, p_kind text, p_name text, p_email text, p_phone text, p_state text, p_details text)
returns text
language plpgsql security definer set search_path = '' as $$
begin
  if not private.key_ok('form_rpc', p_key) then return 'forbidden'; end if;
  return private.privacy_request_unkeyed(p_form, p_ip_hash, p_kind, p_name, p_email, p_phone, p_state, p_details);
end $$;
revoke execute on function public.submit_privacy_request(text, uuid, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_privacy_request(text, uuid, text, text, text, text, text, text, text) to anon, authenticated;
