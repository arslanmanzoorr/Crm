-- Lead ownership, round-robin routing, response-time tracking, tags.

-- 1. Owners must be members of the lead's org. If the member leaves, the lead becomes unassigned
--    (only owner_id is nulled; org_id stays).
alter table contacts drop constraint contacts_owner_id_fkey;
update contacts c set owner_id = null
where owner_id is not null and not exists (select 1 from memberships m where m.org_id = c.org_id and m.user_id = c.owner_id);
alter table contacts add constraint contacts_owner_member
  foreign key (org_id, owner_id) references memberships (org_id, user_id) on delete set null (owner_id);

-- 2. Routing settings.
alter table organizations add column routing text not null default 'off' check (routing in ('off', 'round_robin'));
alter table memberships add column in_rotation boolean not null default true;
alter table memberships add column last_assigned_at timestamptz;

-- Owners/admins toggle who is in the rotation. A function, not an UPDATE policy: policies are OR'ed,
-- so a broad admin update policy would also let admins change roles.
create function public.set_rotation(p_user uuid, p_in boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if private.my_role() not in ('owner', 'admin') then return false; end if;
  update public.memberships set in_rotation = p_in where org_id = private.my_org() and user_id = p_user;
  return found;
end $$;
revoke execute on function public.set_rotation(uuid, boolean) from public, anon;
grant execute on function public.set_rotation(uuid, boolean) to authenticated;

-- New leads without an owner (web forms, imports) go to the in-rotation member who waited longest.
-- FOR UPDATE SKIP LOCKED: two leads arriving together go to two different people.
create function private.route_lead() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  if new.owner_id is not null or (select routing from public.organizations where id = new.org_id) <> 'round_robin' then
    return new;
  end if;
  select user_id into v_user from public.memberships
  where org_id = new.org_id and in_rotation and role <> 'assistant'
  order by last_assigned_at nulls first, created_at
  limit 1 for update skip locked;
  if v_user is not null then
    new.owner_id := v_user;
    update public.memberships set last_assigned_at = now() where org_id = new.org_id and user_id = v_user;
  end if;
  return new;
end $$;
create trigger route_lead before insert on contacts for each row execute function private.route_lead();

-- 3. Response time: first outbound touch (not a note) after the lead was created.
alter table contacts add column first_response_at timestamptz;
create or replace function private.touch_contact() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.contacts set
    last_activity_at = greatest(coalesce(last_activity_at, new.ts), new.ts),
    first_response_at = case
      when first_response_at is null and new.direction = 'out' and new.channel <> 'Note' and new.ts >= created_at then new.ts
      else first_response_at end
  where id = new.contact_id;
  return null;
end $$;

-- 4. Tags.
alter table contacts add column tags text[] not null default '{}'
  check (cardinality(tags) <= 20 and private.join_text(tags) !~ '[<>]');
create index contacts_tags on contacts using gin (tags);
create index contacts_org_owner on contacts (org_id, owner_id);

-- Audit: routing bookkeeping isn't an edit either.
create or replace function private.audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r record := coalesce(new, old);
begin
  if tg_op = 'UPDATE' and (to_jsonb(new) - 'last_activity_at' - 'search' - 'first_response_at')
                        = (to_jsonb(old) - 'last_activity_at' - 'search' - 'first_response_at') then
    return null;
  end if;
  insert into public.audit_log (org_id, actor, action, entity, entity_id, before, after)
  values (r.org_id, auth.uid(), lower(tg_op), tg_table_name, r.id,
          case when tg_op <> 'INSERT' then to_jsonb(old) - 'search' end,
          case when tg_op <> 'DELETE' then to_jsonb(new) - 'search' end);
  return null;
end $$;
