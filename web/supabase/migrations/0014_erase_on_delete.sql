-- Deleting a lead must erase them (CCPA/CPRA and other state privacy laws: right to delete).
-- Activities and tasks already cascade, but the audit log kept full copies of the person in before/after.
-- Now: deletes of contacts and tasks log only the id, and deleting a contact wipes the person's details
-- from every earlier audit row (contact rows and task rows that pointed at them). The who/when/what stays.
create or replace function private.audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r record := coalesce(new, old);
begin
  if tg_op = 'UPDATE' and (to_jsonb(new) - 'last_activity_at' - 'search' - 'first_response_at')
                        = (to_jsonb(old) - 'last_activity_at' - 'search' - 'first_response_at') then
    return null;
  end if;

  if tg_op = 'DELETE' and tg_table_name = 'contacts' then
    -- ponytail: scans the org's task audit rows by jsonb; add an indexed contact_id column if audit_log gets huge
    update public.audit_log set before = null, after = null
    where org_id = old.org_id
      and ((entity = 'contacts' and entity_id = old.id)
        or (entity = 'tasks' and (before->>'contact_id' = old.id::text or after->>'contact_id' = old.id::text)));
  end if;

  insert into public.audit_log (org_id, actor, action, entity, entity_id, before, after)
  values (r.org_id, auth.uid(), lower(tg_op), tg_table_name, r.id,
          case when tg_op = 'DELETE' and tg_table_name in ('contacts', 'tasks') then null
               when tg_op <> 'INSERT' then to_jsonb(old) - 'search' end,
          case when tg_op <> 'DELETE' then to_jsonb(new) - 'search' end);
  return null;
end $$;
