-- Security hardening: helpers out of the REST API, input size limits, audit log, AI usage metering.

-- 1. Helper functions live in a schema PostgREST does not expose, so they can't be called as /rpc/*.
--    Policies and column defaults reference functions by OID, so moving them keeps everything working.
create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.my_org() set schema private;
alter function public.is_member(uuid) set schema private;
alter function public.handle_new_user() set schema private;
grant execute on function private.my_org() to authenticated;
grant execute on function private.is_member(uuid) to authenticated;

-- Supabase's auto-RLS event trigger: keep it, but it is not an API endpoint.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- 2. Policy evaluated once per query, not per row.
drop policy "read own memberships" on memberships;
create policy "read own memberships" on memberships for select using (user_id = (select auth.uid()));

-- 3. Indexes for every foreign key (deletes and joins stay fast as orgs grow).
create index if not exists activities_org_id_idx on activities (org_id);
create index if not exists activities_user_id_idx on activities (user_id);
create index if not exists contacts_owner_id_idx on contacts (owner_id);
create index if not exists memberships_user_id_idx on memberships (user_id);
create index if not exists tasks_assignee_id_idx on tasks (assignee_id);
create index if not exists tasks_contact_id_idx on tasks (contact_id);

-- 4. Size limits, enforced by the database whatever the client sends.
alter table contacts
  add constraint contacts_sizes check (
    length(name) <= 200 and length(coalesce(email, '')) <= 320 and length(coalesce(phone, '')) <= 40
    and length(budget) <= 100 and length(intent) <= 500 and length(next_action) <= 1000
    and cardinality(sources) <= 20 and cardinality(areas) <= 50 and cardinality(preferences) <= 50
  );
alter table properties
  add constraint properties_sizes check (
    length(address) <= 300 and length(area) <= 100 and length(description) <= 10000
    and length(coalesce(mls_id, '')) <= 50 and cardinality(features) <= 50
    and beds between 0 and 100 and baths between 0 and 100 and sqft between 0 and 1000000
  );
alter table activities add constraint activities_sizes check (length(content) <= 10000);
alter table tasks add constraint tasks_sizes check (length(title) <= 300 and length(note) <= 2000);
alter table organizations add constraint organizations_sizes check (length(name) <= 200);

-- 5. Audit log: who changed what, written only by triggers.
create table audit_log (
  id bigint generated always as identity primary key,
  org_id uuid not null references organizations on delete cascade,
  actor uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  ts timestamptz not null default now()
);
create index on audit_log (org_id, ts desc);
alter table audit_log enable row level security;
create policy "members read audit" on audit_log for select using (private.is_member(org_id));

create function private.audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r record := coalesce(new, old);
begin
  insert into public.audit_log (org_id, actor, action, entity, entity_id, before, after)
  values (r.org_id, auth.uid(), lower(tg_op), tg_table_name, r.id,
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return null;
end $$;

create trigger audit after insert or update or delete on contacts for each row execute function private.audit();
create trigger audit after insert or update or delete on properties for each row execute function private.audit();
create trigger audit after insert or update or delete on tasks for each row execute function private.audit();

-- 6. AI usage metering: one row per AI call, used for per-org daily caps (and billing later).
create table ai_usage (
  id bigint generated always as identity primary key,
  org_id uuid not null default private.my_org() references organizations on delete cascade,
  user_id uuid default auth.uid() references auth.users on delete set null,
  task text not null check (length(task) <= 40),
  ts timestamptz not null default now()
);
create index on ai_usage (org_id, ts desc);
create index on ai_usage (user_id);
alter table ai_usage enable row level security;
-- Insert + read only: members can't delete rows to reset their cap.
create policy "members read usage" on ai_usage for select using (private.is_member(org_id));
create policy "members log usage" on ai_usage for insert with check (private.is_member(org_id) and user_id = (select auth.uid()));
