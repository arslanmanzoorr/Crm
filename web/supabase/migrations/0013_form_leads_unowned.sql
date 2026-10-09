-- Form leads always start unassigned (then routing decides). Before this, contacts.owner_id defaulted to
-- the visitor's session: an agent testing their own form became the owner, and a visitor signed in to a
-- different team failed the same-team owner check, so their inquiry was lost.
create or replace function private.submit_lead_unkeyed(
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

  if (select count(*) from public.form_submissions where ip_hash = p_ip_hash and ts > now() - interval '1 hour') >= 5
     or (select count(*) from public.form_submissions where form_id = f.id and ts > now() - interval '1 hour') >= 60 then
    return 'limited';
  end if;
  insert into public.form_submissions (form_id, ip_hash) values (f.id, p_ip_hash);

  select id into v_contact from public.contacts
  where org_id = f.org_id and ((v_email is not null and lower(email) = v_email) or (v_phone is not null and phone = v_phone))
  order by created_at limit 1;

  if v_contact is null then
    insert into public.contacts (org_id, owner_id, name, email, phone, sources, consent_call, consent_sms, consent_email, intent)
    values (f.org_id, null, v_name, v_email, v_phone, array[v_source], coalesce(p_consent_call_sms, false), coalesce(p_consent_call_sms, false),
            coalesce(p_consent_email, false), 'New web inquiry')
    returning id into v_contact;
  else
    update public.contacts set
      consent_call = consent_call or coalesce(p_consent_call_sms, false),
      consent_sms = consent_sms or coalesce(p_consent_call_sms, false),
      consent_email = consent_email or coalesce(p_consent_email, false),
      sources = case when v_source = any(sources) then sources else sources || v_source end
    where id = v_contact;
  end if;

  insert into public.activities (org_id, contact_id, user_id, channel, direction, content)
  values (f.org_id, v_contact, null, 'Note', 'in', left('Web form (' || f.name || ')' || case when v_msg <> '' then ': ' || v_msg else '' end, 10000));

  if not exists (select 1 from public.tasks where contact_id = v_contact and created_by = 'system' and not done) then
    insert into public.tasks (org_id, contact_id, assignee_id, kind, title, note, due_at, created_by)
    values (f.org_id, v_contact, (select owner_id from public.contacts where id = v_contact), 'call', 'Call new web lead',
            'Speed to lead: first call within 5 minutes converts best.', now() + interval '5 minutes', 'system');
  end if;
  return 'ok';
end $$;
