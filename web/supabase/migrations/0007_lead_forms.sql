-- Public lead capture: per-org forms, one hardened entry point, rate limits, dedupe, speed-to-lead task.

create table lead_forms (
  id uuid primary key default gen_random_uuid(), -- public id in the form URL
  org_id uuid not null default private.my_org() references organizations on delete cascade,
  name text not null default 'Website' check (length(name) between 1 and 60),
  public_name text check (length(public_name) <= 80), -- shown on the public form, e.g. "Jane Smith Realty"
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create index on lead_forms (org_id);
alter table lead_forms enable row level security;
create policy "org members" on lead_forms for all using (private.is_member(org_id)) with check (private.is_member(org_id));

-- Submissions log, for rate limiting only. No PII: the IP arrives already hashed by the app server.
create table form_submissions (
  id bigint generated always as identity primary key,
  form_id uuid not null references lead_forms on delete cascade,
  ip_hash text not null check (length(ip_hash) <= 64),
  ts timestamptz not null default now()
);
create index on form_submissions (form_id, ts desc);
create index on form_submissions (ip_hash, ts desc);
alter table form_submissions enable row level security; -- no policies: only the function below writes it

alter table tasks drop constraint tasks_created_by_check;
alter table tasks add constraint tasks_created_by_check check (created_by in ('user', 'ai', 'system'));

-- What the public form may show: the agent-chosen public name and whether it's open. Nothing else.
create function public.lead_form_info(p_form uuid) returns table (public_name text, enabled boolean)
language sql stable security definer set search_path = '' as $$
  select f.public_name, f.enabled from public.lead_forms f where f.id = p_form
$$;

/**
 * The only way anonymous visitors can write. Validates everything itself; returns a status word.
 * Dedupes on email or phone within the org: a returning lead gets an activity, not a duplicate.
 */
create function public.submit_lead(
  p_form uuid, p_ip_hash text, p_name text, p_email text, p_phone text, p_message text,
  p_consent_call_sms boolean, p_consent_email boolean, p_source text
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  f public.lead_forms;
  v_name text := left(btrim(regexp_replace(coalesce(p_name, ''), '[<>]', '', 'g')), 200);
  v_email text := nullif(lower(left(btrim(coalesce(p_email, '')), 320)), '');
  v_phone text := nullif(left(regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g'), 20), '');
  v_msg text := left(btrim(coalesce(p_message, '')), 2000);
  v_source text := left(coalesce(nullif(btrim(p_source), ''), 'Website'), 40);
  v_contact uuid;
begin
  select * into f from public.lead_forms where id = p_form;
  if f.id is null or not f.enabled then return 'closed'; end if;
  if length(v_name) = 0 or (v_email is null and v_phone is null) then return 'invalid'; end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return 'invalid'; end if;
  if p_ip_hash is null or length(p_ip_hash) > 64 then return 'invalid'; end if;

  -- Rate limits: 5 per visitor per hour, 60 per form per hour.
  if (select count(*) from public.form_submissions where ip_hash = p_ip_hash and ts > now() - interval '1 hour') >= 5
     or (select count(*) from public.form_submissions where form_id = f.id and ts > now() - interval '1 hour') >= 60 then
    return 'limited';
  end if;
  insert into public.form_submissions (form_id, ip_hash) values (f.id, p_ip_hash);

  select id into v_contact from public.contacts
  where org_id = f.org_id and ((v_email is not null and lower(email) = v_email) or (v_phone is not null and phone = v_phone))
  order by created_at limit 1;

  if v_contact is null then
    insert into public.contacts (org_id, name, email, phone, sources, consent_call, consent_sms, consent_email, intent)
    values (f.org_id, v_name, v_email, v_phone, array[v_source], coalesce(p_consent_call_sms, false), coalesce(p_consent_call_sms, false),
            coalesce(p_consent_email, false), 'New web inquiry')
    returning id into v_contact;
  else
    -- Consent can be granted again by the lead, never silently revoked by a resubmission.
    update public.contacts set
      consent_call = consent_call or coalesce(p_consent_call_sms, false),
      consent_sms = consent_sms or coalesce(p_consent_call_sms, false),
      consent_email = consent_email or coalesce(p_consent_email, false),
      sources = case when v_source = any(sources) then sources else sources || v_source end
    where id = v_contact;
  end if;

  insert into public.activities (org_id, contact_id, channel, direction, content)
  values (f.org_id, v_contact, 'Note', 'in', left('Web form (' || f.name || ')' || case when v_msg <> '' then ': ' || v_msg else '' end, 10000));

  -- One open speed-to-lead task per lead, however many times they submit.
  if not exists (select 1 from public.tasks where contact_id = v_contact and created_by = 'system' and not done) then
    insert into public.tasks (org_id, contact_id, kind, title, note, due_at, created_by)
    values (f.org_id, v_contact, 'call', 'Call new web lead',
            'Speed to lead: first call within 5 minutes converts best.', now() + interval '5 minutes', 'system');
  end if;
  return 'ok';
end $$;

revoke execute on function public.submit_lead(uuid, text, text, text, text, text, boolean, boolean, text) from public;
grant execute on function public.submit_lead(uuid, text, text, text, text, text, boolean, boolean, text) to anon, authenticated;
revoke execute on function public.lead_form_info(uuid) from public;
grant execute on function public.lead_form_info(uuid) to anon, authenticated;

create index contacts_org_email on contacts (org_id, lower(email));
create index contacts_org_phone on contacts (org_id, phone);

-- Every org gets a form; new orgs get one at sign-up.
insert into lead_forms (org_id) select id from organizations;
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare org uuid;
begin
  insert into public.organizations (name) values (coalesce(split_part(new.email, '@', 1), 'My') || '''s team') returning id into org;
  insert into public.memberships (org_id, user_id) values (org, new.id);
  insert into public.lead_forms (org_id) values (org);
  return new;
end $$;
