-- Automated playbooks: when something happens to a lead, run timed steps (follow-up tasks, tags).
-- Enrollment happens in triggers; a pg_cron job runs due steps every minute with retries.
-- Steps never contact anyone by themselves: they create tasks for a person (the human approval gate).

create extension if not exists pg_cron;

create table workflows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default private.my_org() references organizations on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  trigger text not null check (trigger in ('lead_created', 'stage_changed', 'showing_feedback', 'open_house_visit', 'deal_opened', 'deal_closed')),
  conditions jsonb not null default '{}' check (jsonb_typeof(conditions) = 'object'),
  steps jsonb not null check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) between 1 and 20),
  stop_stages text[] not null default '{Lost}',
  enabled boolean not null default true,
  template text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (id, org_id)
);
create index on workflows (org_id, trigger) where enabled;
alter table workflows enable row level security;
create policy "members read" on workflows for select using (org_id = (select private.my_org()));
create policy "admins write" on workflows for all
  using (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'))
  with check (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'));

create table workflow_runs (
  id bigint generated always as identity primary key,
  org_id uuid not null,
  workflow_id uuid not null,
  contact_id uuid not null,
  step int not null check (step >= 0),
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'done', 'skipped', 'failed')),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  done_at timestamptz,
  foreign key (workflow_id, org_id) references workflows (id, org_id) on delete cascade,
  foreign key (contact_id, org_id) references contacts (id, org_id) on delete cascade
);
create index workflow_runs_due on workflow_runs (due_at) where status = 'pending';
create index on workflow_runs (workflow_id, status);
create index on workflow_runs (contact_id) where status = 'pending';
alter table workflow_runs enable row level security;
create policy "members read" on workflow_runs for select using (org_id = (select private.my_org()));
create policy "admins cancel" on workflow_runs for update
  using (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'))
  with check (org_id = (select private.my_org()));

-- Enroll a lead in every enabled workflow for this trigger whose conditions all match (text equality on ctx keys).
create function private.enroll(p_org uuid, p_trigger text, p_contact uuid, p_ctx jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare w public.workflows;
begin
  for w in select * from public.workflows where org_id = p_org and trigger = p_trigger and enabled loop
    continue when exists (select 1 from jsonb_each_text(w.conditions) c where c.value <> coalesce(p_ctx->>c.key, ''));
    continue when exists (select 1 from public.workflow_runs r where r.workflow_id = w.id and r.contact_id = p_contact and r.status = 'pending');
    insert into public.workflow_runs (org_id, workflow_id, contact_id, step, due_at)
    select p_org, w.id, p_contact, s.i - 1,
           now() + make_interval(mins => greatest(0, least(coalesce((s.step->>'after_hours')::numeric, 0), 8760) * 60)::int)
    from jsonb_array_elements(w.steps) with ordinality as s(step, i);
  end loop;
end $$;
revoke execute on function private.enroll(uuid, text, uuid, jsonb) from public, anon, authenticated;

create function private.wf_contacts() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.enroll(new.org_id, 'lead_created', new.id, jsonb_build_object('type', new.type, 'source', coalesce(new.sources[1], ''), 'stage', new.stage));
  elsif new.stage is distinct from old.stage then
    -- Stop rule: a lead reaching a stop stage leaves those workflows.
    update public.workflow_runs r set status = 'skipped', last_error = 'Stopped: lead moved to ' || new.stage, done_at = now()
    from public.workflows w
    where r.workflow_id = w.id and r.contact_id = new.id and r.status = 'pending' and new.stage = any(w.stop_stages);
    perform private.enroll(new.org_id, 'stage_changed', new.id, jsonb_build_object('type', new.type, 'stage', new.stage));
  end if;
  return null;
end $$;
create trigger workflows after insert or update of stage on contacts for each row execute function private.wf_contacts();

create function private.wf_deals() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.enroll(new.org_id, 'deal_opened', new.contact_id, jsonb_build_object('side', new.side));
  elsif new.status = 'closed' and old.status <> 'closed' then
    perform private.enroll(new.org_id, 'deal_closed', new.contact_id, jsonb_build_object('side', new.side));
  end if;
  return null;
end $$;
create trigger workflows after insert or update of status on deals for each row execute function private.wf_deals();

create function private.wf_showings() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.interest is not null and old.interest is null then
    perform private.enroll(new.org_id, 'showing_feedback', new.contact_id, jsonb_build_object('interest', new.interest));
  end if;
  return null;
end $$;
create trigger workflows after update of interest on showings for each row execute function private.wf_showings();

create function private.wf_visits() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.enroll(new.org_id, 'open_house_visit', new.contact_id, jsonb_build_object('has_agent', new.has_agent::text));
  return null;
end $$;
create trigger workflows after insert on open_house_visits for each row execute function private.wf_visits();

-- Run due steps. Each step in its own sub-transaction: one bad step can't block the rest.
-- Failures retry with backoff (5, 10, 20, 40 min) and are marked failed after 5 attempts.
create function private.run_workflows() returns int
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  n int := 0;
  first text;
begin
  for r in
    select wr.id, wr.org_id, wr.contact_id, wr.attempts, w.enabled, w.stop_stages, w.steps->wr.step as step, c.stage, c.name, c.owner_id
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
revoke execute on function private.run_workflows() from public, anon, authenticated;

select cron.schedule('estateos-run-workflows', '* * * * *', 'select private.run_workflows()');
