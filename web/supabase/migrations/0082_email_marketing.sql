-- Email newsletters and drips. Campaigns and automation "email" steps queue messages in email_messages; the app's
-- dispatcher (server-only, Resend) renders and sends them. Only leads who agreed to email, with an address that
-- isn't suppressed, are ever queued, and the dispatcher checks again at send time.

-- Sender: the team's own domain (verified in Resend), reply-to, and the postal address the law requires (CAN-SPAM).
alter table public.organizations
  add column email_from_name text check (length(email_from_name) <= 80),
  add column email_from_address text check (email_from_address ~* '^[^@\s<>"]+@([a-z0-9-]+\.)+[a-z]{2,}$' and length(email_from_address) <= 200),
  add column email_reply_to text check (email_reply_to ~* '^[^@\s<>"]+@([a-z0-9-]+\.)+[a-z]{2,}$' and length(email_reply_to) <= 200),
  add column email_postal_address text check (length(email_postal_address) <= 300);
grant update (email_from_name, email_from_address, email_reply_to, email_postal_address) on public.organizations to authenticated;

-- "email" is a module owners can switch off.
alter table public.organizations drop constraint organizations_disabled_features_check;
alter table public.organizations add constraint organizations_disabled_features_check check (
  cardinality(disabled_features) <= 20
  and disabled_features <@ array['listings','showings','deals','inbox','clients','analytics','tools','automations','farm','marketing','partners','tour','email']
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default private.my_org() references public.organizations on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  subject text not null default '' check (length(subject) <= 200),
  preheader text not null default '' check (length(preheader) <= 200),
  body text not null default '' check (length(body) <= 20000),
  audience jsonb not null default '{}' check (jsonb_typeof(audience) = 'object' and octet_length(audience::text) <= 4000),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  recipients int not null default 0,
  repeat_monthly boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, org_id)
);
create index on public.campaigns (org_id, created_at desc);
create index campaigns_due on public.campaigns (scheduled_at) where status = 'scheduled';
alter table public.campaigns enable row level security;
create policy "members read" on public.campaigns for select using (org_id = (select private.my_org()));
create policy "admins create" on public.campaigns for insert
  with check (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'));
create policy "admins edit drafts" on public.campaigns for update
  using (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin') and status in ('draft', 'cancelled'))
  with check (org_id = (select private.my_org()));
create policy "admins delete drafts" on public.campaigns for delete
  using (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin') and status in ('draft', 'cancelled'));
revoke update on public.campaigns from anon, authenticated;
grant update (name, subject, preheader, body, audience, repeat_monthly, updated_at) on public.campaigns to authenticated;

create table public.email_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations on delete cascade,
  contact_id uuid not null,
  campaign_id uuid references public.campaigns on delete cascade,
  workflow_run_id bigint,
  to_email text not null,
  subject text,
  body text,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'skipped', 'bounced', 'complained')),
  provider_id text,
  error text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  foreign key (contact_id, org_id) references public.contacts (id, org_id) on delete cascade
);
create index email_messages_queue on public.email_messages (created_at) where status = 'queued';
create index on public.email_messages (provider_id);
create index on public.email_messages (campaign_id);
create index on public.email_messages (org_id, created_at desc);
alter table public.email_messages enable row level security;
create policy "members read" on public.email_messages for select using (org_id = (select private.my_org()));
revoke insert, update, delete on public.email_messages from anon, authenticated;

-- Who a campaign reaches: agreed to email, has an address, not unsubscribed/bounced, not a practice lead.
create function private.audience(p_org uuid, a jsonb) returns table (contact_id uuid, email text)
language sql stable security definer set search_path = '' as $$
  select c.id, lower(c.email) from public.contacts c
  where c.org_id = p_org and c.email is not null and c.consent_email and not c.is_sample
    and not exists (select 1 from public.suppressions s where s.org_id = c.org_id and s.kind = 'email' and s.value = lower(c.email))
    and (jsonb_array_length(coalesce(a->'types', '[]')) = 0 or c.type in (select jsonb_array_elements_text(a->'types')))
    and (jsonb_array_length(coalesce(a->'stages', '[]')) = 0 or c.stage in (select jsonb_array_elements_text(a->'stages')))
    and (jsonb_array_length(coalesce(a->'tags', '[]')) = 0 or c.tags && array(select jsonb_array_elements_text(a->'tags')))
    and (coalesce((a->>'pastClients')::boolean, false) = false
         or exists (select 1 from public.deals d where d.contact_id = c.id and d.status = 'closed'))
$$;

create function public.campaign_audience_count(p_audience jsonb) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from private.audience((select private.my_org()), p_audience)
$$;

-- Queue every recipient of a campaign (deduped by address). A monthly campaign leaves a fresh draft for next month
-- and a task to review it, so a person approves every issue.
create function private.queue_campaign(p_campaign uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare c public.campaigns; n int;
begin
  select * into c from public.campaigns where id = p_campaign for update;
  insert into public.email_messages (org_id, contact_id, campaign_id, to_email)
  select distinct on (a.email) c.org_id, a.contact_id, c.id, a.email from private.audience(c.org_id, c.audience) a;
  get diagnostics n = row_count;
  update public.campaigns set status = 'sending', recipients = n, sent_at = now() where id = c.id;
  if c.repeat_monthly then
    insert into public.campaigns (org_id, name, subject, preheader, body, audience, repeat_monthly, created_by)
    values (c.org_id, c.name, c.subject, c.preheader, c.body, c.audience, true, c.created_by);
    insert into public.tasks (org_id, assignee_id, kind, title, note, due_at, created_by)
    values (c.org_id, c.created_by, 'email', left('Review next issue: ' || c.name, 300), 'Update the numbers and send. Nothing goes out until you do.', now() + interval '28 days', 'system');
  end if;
  return n;
end $$;

-- Send now (p_at null or past) or schedule. Owners/admins, drafts only, needs a subject, body and sender.
create function public.send_campaign(p_campaign uuid, p_at timestamptz) returns int
language plpgsql security definer set search_path = '' as $$
declare c public.campaigns; o public.organizations;
begin
  select * into c from public.campaigns where id = p_campaign and org_id = private.my_org();
  if c.id is null or private.my_role() not in ('owner', 'admin') then raise exception 'not allowed'; end if;
  if c.status not in ('draft', 'cancelled') then raise exception 'not a draft'; end if;
  select * into o from public.organizations where id = c.org_id;
  if btrim(c.subject) = '' or btrim(c.body) = '' then raise exception 'incomplete'; end if;
  if o.email_from_address is null or coalesce(btrim(o.email_postal_address), '') = '' then raise exception 'sender'; end if;
  if p_at is not null and p_at > now() + interval '1 minute' then
    update public.campaigns set status = 'scheduled', scheduled_at = p_at where id = c.id;
    return 0;
  end if;
  return private.queue_campaign(c.id);
end $$;

create function public.cancel_campaign(p_campaign uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if private.my_role() not in ('owner', 'admin') then return false; end if;
  update public.campaigns set status = 'draft', scheduled_at = null where id = p_campaign and org_id = private.my_org() and status = 'scheduled';
  return found;
end $$;

revoke execute on function public.campaign_audience_count(jsonb), public.send_campaign(uuid, timestamptz), public.cancel_campaign(uuid) from public, anon;
grant execute on function public.campaign_audience_count(jsonb), public.send_campaign(uuid, timestamptz), public.cancel_campaign(uuid) to authenticated;
revoke execute on function private.audience(uuid, jsonb), private.queue_campaign(uuid) from public, anon, authenticated;

-- Response time measures people: automated messages (no user) don't count as the first reply.
create or replace function private.touch_contact() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.contacts set
    last_activity_at = greatest(coalesce(last_activity_at, new.ts), new.ts),
    first_response_at = case
      when first_response_at is null and new.direction = 'out' and new.channel <> 'Note' and new.user_id is not null and new.ts >= created_at then new.ts
      else first_response_at end
  where id = new.contact_id;
  return null;
end $$;

-- Automations gain an "email" step: it queues the message (consent and suppression checked here and at send time).
create or replace function private.run_workflows() returns int
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  n int := 0;
  first text;
begin
  for r in
    select wr.id, wr.org_id, wr.contact_id, wr.attempts, w.enabled, w.stop_stages, w.steps->wr.step as step, c.stage, c.name, c.owner_id,
           c.email, c.consent_email, c.is_sample
    from public.workflow_runs wr
    join public.workflows w on w.id = wr.workflow_id
    join public.contacts c on c.id = wr.contact_id
    where wr.status = 'pending' and wr.due_at <= now()
    order by wr.due_at
    limit 500
    for update of wr skip locked
  loop
    begin
      if not r.enabled or r.stage = any(r.stop_stages) then
        update public.workflow_runs set status = 'skipped', done_at = now(), last_error = case when r.enabled then 'Stopped: lead is ' || r.stage else 'Workflow turned off' end where id = r.id;
        continue;
      end if;
      first := split_part(r.name, ' ', 1);
      case r.step->>'kind'
        when 'task' then
          insert into public.tasks (org_id, contact_id, assignee_id, kind, title, note, due_at, created_by)
          values (r.org_id, r.contact_id, r.owner_id,
                  case when r.step->>'task_kind' in ('call', 'video', 'email', 'showing', 'cma') then r.step->>'task_kind' else 'call' end,
                  left(replace(coalesce(nullif(btrim(r.step->>'title'), ''), 'Follow up'), '{first_name}', first), 300),
                  left(replace(coalesce(r.step->>'note', ''), '{first_name}', first), 2000),
                  now(), 'system');
        when 'tag' then
          update public.contacts set tags = case when lower(r.step->>'tag') = any(tags) or cardinality(tags) >= 20 then tags else tags || lower(r.step->>'tag') end
          where id = r.contact_id;
        when 'email' then
          if r.email is null or not r.consent_email or r.is_sample
             or exists (select 1 from public.suppressions s where s.org_id = r.org_id and s.kind = 'email' and s.value = lower(r.email)) then
            update public.workflow_runs set status = 'skipped', done_at = now(), last_error = 'No email consent' where id = r.id;
            continue;
          end if;
          insert into public.email_messages (org_id, contact_id, workflow_run_id, to_email, subject, body)
          values (r.org_id, r.contact_id, r.id, lower(r.email), left(r.step->>'subject', 200), left(r.step->>'body', 20000));
        else
          raise exception 'Unknown step kind %', r.step->>'kind';
      end case;
      update public.workflow_runs set status = 'done', done_at = now() where id = r.id;
      n := n + 1;
    exception when others then
      update public.workflow_runs
      set attempts = r.attempts + 1, last_error = left(sqlerrm, 500),
          status = case when r.attempts + 1 >= 5 then 'failed' else 'pending' end,
          due_at = now() + make_interval(mins => 5 * (2 ^ r.attempts)::int)
      where id = r.id;
    end;
  end loop;
  return n;
end $$;

-- Every minute: queue scheduled campaigns that are due, then wake the app's dispatcher if anything is waiting.
-- The dispatcher URL and secret live in Vault (email_dispatch_url, email_dispatch_secret); until they're set, sending
-- happens only when someone presses Send now.
create extension if not exists pg_net;

create function private.email_tick() returns void
language plpgsql security definer set search_path = '' as $$
declare c record; v_url text; v_secret text;
begin
  for c in select id from public.campaigns where status = 'scheduled' and scheduled_at <= now() for update skip locked loop
    perform private.queue_campaign(c.id);
  end loop;
  if exists (select 1 from public.email_messages where status = 'queued') then
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'email_dispatch_url';
    select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'email_dispatch_secret';
    if v_url is not null and v_secret is not null then
      perform net.http_post(url := v_url, headers := jsonb_build_object('x-dispatch-secret', v_secret, 'content-type', 'application/json'), body := '{}'::jsonb);
    end if;
  end if;
end $$;
revoke execute on function private.email_tick() from public, anon, authenticated;
select cron.schedule('estateos-email-tick', '* * * * *', 'select private.email_tick()');
