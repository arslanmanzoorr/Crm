-- Scale: server-side lead search (trigram), recency tracking, list indexes.

create extension if not exists pg_trgm with schema extensions;

-- array_to_string is only STABLE; for text[] it is safe to treat as immutable in a generated column.
create function private.join_text(text[]) returns text
language sql immutable parallel safe set search_path = '' as $$ select array_to_string($1, ' ') $$;
grant execute on function private.join_text(text[]) to authenticated;

alter table contacts add column search text generated always as (
  lower(name || ' ' || coalesce(email, '') || ' ' || coalesce(phone, '') || ' ' || budget || ' ' || private.join_text(areas))
) stored;
create index contacts_search_trgm on contacts using gin (search extensions.gin_trgm_ops);

alter table contacts add column last_activity_at timestamptz;

-- Audit only real edits: skip updates that change nothing but bookkeeping columns.
-- (Replaced before the backfill below so the backfill doesn't flood the log.)
create or replace function private.audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r record := coalesce(new, old);
begin
  if tg_op = 'UPDATE' and (to_jsonb(new) - 'last_activity_at' - 'search') = (to_jsonb(old) - 'last_activity_at' - 'search') then
    return null;
  end if;
  insert into public.audit_log (org_id, actor, action, entity, entity_id, before, after)
  values (r.org_id, auth.uid(), lower(tg_op), tg_table_name, r.id,
          case when tg_op <> 'INSERT' then to_jsonb(old) - 'search' end,
          case when tg_op <> 'DELETE' then to_jsonb(new) - 'search' end);
  return null;
end $$;

update contacts c set last_activity_at = (select max(ts) from activities a where a.contact_id = c.id);

-- Last touch, kept current by a trigger so lists can sort and flag stale leads without scanning activities.
create function private.touch_contact() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.contacts set last_activity_at = greatest(coalesce(last_activity_at, new.ts), new.ts)
  where id = new.contact_id;
  return null;
end $$;
create trigger touch_contact after insert on activities for each row execute function private.touch_contact();

create index contacts_org_score on contacts (org_id, score desc, id);
create index contacts_org_recent on contacts (org_id, last_activity_at desc nulls last, id);
create index contacts_org_stage on contacts (org_id, stage);
create index activities_org_channel_ts on activities (org_id, channel, ts desc);
