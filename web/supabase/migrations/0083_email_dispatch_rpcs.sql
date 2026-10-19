-- The email dispatcher talks to the database through four narrow functions gated by a shared secret (Vault
-- 'email_dispatch_secret' = the app's EMAIL_DISPATCH_SECRET), instead of the all-powerful service key. Each does one
-- job: claim queued mail with what's needed to render it, report results, unsubscribe one contact, record an event.

create function private.dispatch_ok(p_secret text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(length(p_secret) >= 32 and p_secret = (select decrypted_secret from vault.decrypted_secrets where name = 'email_dispatch_secret'), false)
$$;

-- Claim up to p_limit queued messages (they flip to 'sending', so two dispatchers never send the same one) and
-- return each with sender, branding, recipient and content. Consent and suppression are re-checked here.
create function public.email_claim(p_secret text, p_limit int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  if not private.dispatch_ok(p_secret) then raise exception 'not allowed'; end if;
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
    'team', o.name, 'color', coalesce(o.brand_color, a.brand_color), 'logo', coalesce(o.logo_path, a.logo_path),
    'from_name', o.email_from_name, 'from_address', o.email_from_address, 'reply_to', o.email_reply_to, 'postal', o.email_postal_address)), '[]'::jsonb)
  into v
  from claimed m
  join public.contacts c on c.id = m.contact_id
  join public.organizations o on o.id = m.org_id
  left join public.agencies a on a.id = o.agency_id
  left join public.campaigns cp on cp.id = m.campaign_id;
  return v;
end $$;

-- Results: [{id, status: sent|failed|skipped|queued, provider_id, error}]. Sent mail is logged on the lead's timeline
-- as automated (no user), so it never counts as a person's first reply. Campaigns with nothing left are marked sent.
create function public.email_report(p_secret text, p_results jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare r jsonb; m public.email_messages; n int := 0;
begin
  if not private.dispatch_ok(p_secret) then raise exception 'not allowed'; end if;
  for r in select * from jsonb_array_elements(p_results) loop
    update public.email_messages set
      status = case when r->>'status' in ('sent', 'failed', 'skipped') then r->>'status'
                    when r->>'status' = 'queued' and attempts + 1 < 3 then 'queued' else 'failed' end,
      attempts = attempts + case when r->>'status' in ('queued', 'failed') then 1 else 0 end,
      provider_id = coalesce(r->>'provider_id', provider_id), error = left(r->>'error', 300),
      sent_at = case when r->>'status' = 'sent' then now() else sent_at end
    where id = (r->>'id')::uuid and status = 'sending'
    returning * into m;
    if m.id is not null and m.status = 'sent' then
      insert into public.activities (org_id, contact_id, user_id, channel, direction, content)
      values (m.org_id, m.contact_id, null, 'Email', 'out', left(case when m.campaign_id is not null then 'Newsletter: ' else 'Automated email: ' end || coalesce(r->>'subject', ''), 1000));
      n := n + 1;
    end if;
  end loop;
  update public.campaigns c set status = 'sent' where c.status = 'sending'
    and not exists (select 1 from public.email_messages e where e.campaign_id = c.id and e.status in ('queued', 'sending'));
  return n;
end $$;

create function public.email_unsubscribe(p_secret text, p_contact uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.contacts; v_team text;
begin
  if not private.dispatch_ok(p_secret) then raise exception 'not allowed'; end if;
  select * into c from public.contacts where id = p_contact;
  if c.id is null or c.email is null then return null; end if;
  insert into public.suppressions (org_id, kind, value, reason, added_by) values (c.org_id, 'email', lower(c.email), 'Unsubscribed via email link', null)
    on conflict do nothing;
  update public.contacts set consent_email = false where id = c.id;
  insert into public.activities (org_id, contact_id, user_id, channel, direction, content) values (c.org_id, c.id, null, 'Note', 'in', 'Unsubscribed from email (link in an email).');
  select coalesce(email_from_name, name) into v_team from public.organizations where id = c.org_id;
  return jsonb_build_object('team', v_team);
end $$;

create function public.email_event(p_secret text, p_type text, p_provider_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.email_messages;
begin
  if not private.dispatch_ok(p_secret) then raise exception 'not allowed'; end if;
  select * into m from public.email_messages where provider_id = p_provider_id;
  if m.id is null then return; end if;
  case p_type
    when 'email.delivered' then update public.email_messages set delivered_at = coalesce(delivered_at, now()) where id = m.id;
    when 'email.opened' then update public.email_messages set opened_at = coalesce(opened_at, now()) where id = m.id;
    when 'email.clicked' then update public.email_messages set clicked_at = coalesce(clicked_at, now()) where id = m.id;
    when 'email.bounced', 'email.complained' then
      update public.email_messages set status = case when p_type = 'email.bounced' then 'bounced' else 'complained' end where id = m.id;
      insert into public.suppressions (org_id, kind, value, reason, added_by)
      values (m.org_id, 'email', m.to_email, case when p_type = 'email.bounced' then 'Email bounced' else 'Marked as spam' end, null) on conflict do nothing;
    else null;
  end case;
end $$;

revoke execute on function private.dispatch_ok(text) from public, anon, authenticated;
revoke execute on function public.email_claim(text, int), public.email_report(text, jsonb), public.email_unsubscribe(text, uuid), public.email_event(text, text, text) from public;
grant execute on function public.email_claim(text, int), public.email_report(text, jsonb), public.email_unsubscribe(text, uuid), public.email_event(text, text, text) to anon, authenticated;
