-- Public API (v1): per-team API keys for the team's own website or tools. Keys are shown once and stored only as
-- a SHA-256 hash. Each key reaches only its team's data through the api_* functions below (no table access).
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default private.my_org() references public.organizations (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  prefix text not null,
  key_hash text not null unique,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index api_keys_org_idx on public.api_keys (org_id);
create index api_keys_created_by_idx on public.api_keys (created_by);
alter table public.api_keys enable row level security;
create policy "admins read keys" on public.api_keys for select to authenticated
  using (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'));
create policy "admins revoke keys" on public.api_keys for update to authenticated
  using (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'))
  with check (org_id = (select private.my_org()));

create function public.create_api_key(p_name text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_key text := 'eos_' || encode(extensions.gen_random_bytes(24), 'hex');
begin
  if (select private.my_role()) is distinct from 'owner' and (select private.my_role()) is distinct from 'admin' then
    raise exception 'Only owners and admins can create API keys';
  end if;
  if (select count(*) from public.api_keys where org_id = private.my_org() and revoked_at is null) >= 10 then
    raise exception 'Up to 10 active keys; revoke one first';
  end if;
  insert into public.api_keys (org_id, name, prefix, key_hash)
  values (private.my_org(), left(btrim(p_name), 80), left(v_key, 12), encode(sha256(convert_to(v_key, 'UTF8')), 'hex'));
  return v_key;
end $$;
revoke execute on function public.create_api_key(text) from public, anon;
grant execute on function public.create_api_key(text) to authenticated;

-- The live key row (null if unknown or revoked). Touches last_used_at at most once a minute.
create function private.api_key(p_key text) returns public.api_keys
language plpgsql security definer set search_path = '' as $$
declare k public.api_keys;
begin
  if p_key is null or p_key !~ '^eos_[0-9a-f]{48}$' then return null; end if;
  select * into k from public.api_keys where key_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex') and revoked_at is null;
  if k.id is not null and (k.last_used_at is null or k.last_used_at < now() - interval '1 minute') then
    update public.api_keys set last_used_at = now() where id = k.id;
  end if;
  return k;
end $$;

create function public.api_leads(p_key text, p_since timestamptz default null, p_limit int default 100) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare k public.api_keys := private.api_key(p_key);
begin
  if k.id is null then return null; end if;
  return coalesce((select jsonb_agg(x order by x.created_at desc) from (
    select c.id, c.name, c.email, c.phone, c.type, c.stage, c.sources, c.tags, c.areas, c.budget,
           c.consent_call, c.consent_sms, c.consent_email, c.dnc, c.created_at, c.last_activity_at
    from public.contacts c
    where c.org_id = k.org_id and (p_since is null or c.created_at > p_since)
    order by c.created_at desc limit greatest(1, least(coalesce(p_limit, 100), 500))) x), '[]');
end $$;

create function public.api_listings(p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare k public.api_keys := private.api_key(p_key);
begin
  if k.id is null then return null; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'address', p.address, 'area', p.area, 'price', p.price, 'beds', p.beds,
      'baths', p.baths, 'sqft', p.sqft, 'status', p.status, 'kind', p.listing_kind, 'created_at', p.created_at) order by p.created_at desc)
    from public.properties p where p.org_id = k.org_id), '[]');
end $$;

-- Same rules as the web form: dedupe on email/phone, consent only ever added, a 5-minute call task for the owner.
create function public.api_create_lead(p_key text, p_name text, p_email text, p_phone text, p_message text, p_source text,
  p_consent_call_sms boolean, p_consent_email boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  k public.api_keys := private.api_key(p_key);
  v_name text := left(btrim(regexp_replace(coalesce(p_name, ''), '[<>]', '', 'g')), 200);
  v_email text := nullif(lower(left(btrim(coalesce(p_email, '')), 320)), '');
  v_phone text := nullif(left(regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g'), 20), '');
  v_msg text := left(btrim(coalesce(p_message, '')), 2000);
  v_source text := left(coalesce(nullif(btrim(p_source), ''), 'API'), 40);
  v_contact uuid; v_new boolean := false;
begin
  if k.id is null then return null; end if;
  if length(v_name) = 0 or (v_email is null and v_phone is null) then return jsonb_build_object('error', 'name and an email or phone are required'); end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('error', 'email is not valid'); end if;

  select id into v_contact from public.contacts
  where org_id = k.org_id and ((v_email is not null and lower(email) = v_email) or (v_phone is not null and phone = v_phone))
  order by created_at limit 1;
  if v_contact is null then
    insert into public.contacts (org_id, owner_id, type, name, email, phone, sources, consent_call, consent_sms, consent_email, intent)
    values (k.org_id, null, 'buyer', v_name, v_email, v_phone, array[v_source], coalesce(p_consent_call_sms, false), coalesce(p_consent_call_sms, false),
            coalesce(p_consent_email, false), 'New inquiry')
    returning id into v_contact;
    v_new := true;
  else
    update public.contacts set
      consent_call = consent_call or coalesce(p_consent_call_sms, false),
      consent_sms = consent_sms or coalesce(p_consent_call_sms, false),
      consent_email = consent_email or coalesce(p_consent_email, false),
      sources = case when v_source = any(sources) then sources else sources || v_source end
    where id = v_contact;
  end if;
  insert into public.activities (org_id, contact_id, user_id, channel, direction, content)
  values (k.org_id, v_contact, null, 'Note', 'in', left('API (' || k.name || ')' || case when v_msg <> '' then ': ' || v_msg else '' end, 10000));
  if not exists (select 1 from public.tasks where contact_id = v_contact and created_by = 'system' and not done) then
    insert into public.tasks (org_id, contact_id, assignee_id, kind, title, note, due_at, created_by)
    values (k.org_id, v_contact, (select owner_id from public.contacts where id = v_contact), 'call', 'Call new lead',
            'Speed to lead: first call within 5 minutes converts best.', now() + interval '5 minutes', 'system');
  end if;
  return jsonb_build_object('id', v_contact, 'created', v_new);
end $$;

revoke execute on function private.api_key(text) from public, anon, authenticated;
revoke execute on function public.api_leads(text, timestamptz, int), public.api_listings(text),
  public.api_create_lead(text, text, text, text, text, text, boolean, boolean) from public;
grant execute on function public.api_leads(text, timestamptz, int), public.api_listings(text),
  public.api_create_lead(text, text, text, text, text, text, boolean, boolean) to anon, authenticated;
