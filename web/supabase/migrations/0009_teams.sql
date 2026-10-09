-- Teams: one active org per user, org-scoped data, roles, email-bound invites.

-- 1. Membership bookkeeping.
alter table memberships add column created_at timestamptz not null default now();
alter table memberships add column email text check (length(email) <= 320);
update memberships m set email = u.email from auth.users u where u.id = m.user_id;

-- 2. Active org per user. Without a profile row, the earliest membership is active.
create table profiles (
  user_id uuid primary key references auth.users on delete cascade,
  active_org_id uuid references organizations on delete set null
);
alter table profiles enable row level security;
create policy "own profile" on profiles for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function private.my_org() returns uuid
language sql stable security definer set search_path = '' as $$
  select m.org_id from public.memberships m
  left join public.profiles p on p.user_id = m.user_id
  where m.user_id = auth.uid()
  order by (m.org_id = p.active_org_id) desc nulls last, m.created_at, m.org_id
  limit 1
$$;

create function private.my_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.memberships where user_id = auth.uid() and org_id = private.my_org()
$$;
grant execute on function private.my_role() to authenticated;

-- 3. Every data policy is scoped to the ACTIVE org, so belonging to two teams never mixes their data.
drop policy "org members" on contacts;
drop policy "org members" on properties;
drop policy "org members" on activities;
drop policy "org members" on tasks;
drop policy "org members" on property_media;
drop policy "org members" on lead_forms;
drop policy "members read usage" on ai_usage;
drop policy "members log usage" on ai_usage;
drop policy "members read audit" on audit_log;

create policy "active org" on contacts for all using (org_id = (select private.my_org())) with check (org_id = (select private.my_org()));
create policy "active org" on properties for all using (org_id = (select private.my_org())) with check (org_id = (select private.my_org()));
create policy "active org" on activities for all using (org_id = (select private.my_org())) with check (org_id = (select private.my_org()));
create policy "active org" on tasks for all using (org_id = (select private.my_org())) with check (org_id = (select private.my_org()));
create policy "active org" on property_media for all using (org_id = (select private.my_org())) with check (org_id = (select private.my_org()));
create policy "active org read" on lead_forms for select using (org_id = (select private.my_org()));
create policy "admins manage forms" on lead_forms for update
  using (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'))
  with check (org_id = (select private.my_org()));
create policy "active org read" on ai_usage for select using (org_id = (select private.my_org()));
create policy "log own usage" on ai_usage for insert with check (org_id = (select private.my_org()) and user_id = (select auth.uid()));
create policy "admins read audit" on audit_log for select using (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'));

-- Storage: photos of the active org only.
create or replace function private.member_of_folder(path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select split_part(path, '/', 1) = private.my_org()::text
$$;

-- Orgs: you can see every org you belong to (for the switcher). Owners/admins can rename the active one.
drop policy "members read org" on organizations;
create policy "my orgs" on organizations for select
  using (exists (select 1 from memberships m where m.org_id = id and m.user_id = (select auth.uid())));
create policy "admins rename org" on organizations for update
  using (id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'))
  with check (id = (select private.my_org()));

-- Memberships: your own, plus teammates in the active org. Owners/admins remove members (never the owner);
-- anyone can leave a team they don't own. Only the owner changes roles.
drop policy "read own memberships" on memberships;
create policy "own and teammates" on memberships for select
  using (user_id = (select auth.uid()) or org_id = (select private.my_org()));
create policy "remove member or leave" on memberships for delete using (
  role <> 'owner' and (
    user_id = (select auth.uid())
    or (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'))
  )
);
create policy "owner sets roles" on memberships for update
  using (org_id = (select private.my_org()) and (select private.my_role()) = 'owner' and user_id <> (select auth.uid()))
  with check (role in ('admin', 'agent', 'assistant'));

-- 4. Invites: single use, bound to an email, expire after 7 days.
create table invites (
  id uuid primary key default gen_random_uuid(), -- the token in the invite link
  org_id uuid not null default private.my_org() references organizations on delete cascade,
  email text not null check (email = lower(email) and length(email) <= 320 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role text not null default 'agent' check (role in ('admin', 'agent', 'assistant')),
  invited_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz
);
create index on invites (org_id);
create unique index invites_one_open_per_email on invites (org_id, email) where accepted_at is null;
alter table invites enable row level security;
create policy "admins manage invites" on invites for all
  using (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'))
  with check (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'));

/** Accept an invite as the signed-in user. The account email must match the invited email. */
create function public.accept_invite(p_token uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  i public.invites;
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then return 'signin'; end if;
  select * into i from public.invites where id = p_token for update;
  if i.id is null then return 'invalid'; end if;
  if i.accepted_at is not null then return 'used'; end if;
  if i.expires_at < now() then return 'expired'; end if;
  if i.email <> v_email then return 'wrong_email'; end if;
  insert into public.memberships (org_id, user_id, role, email) values (i.org_id, auth.uid(), i.role, v_email)
    on conflict (org_id, user_id) do nothing;
  update public.invites set accepted_at = now() where id = i.id;
  insert into public.profiles (user_id, active_org_id) values (auth.uid(), i.org_id)
    on conflict (user_id) do update set active_org_id = excluded.active_org_id;
  return 'ok';
end $$;
revoke execute on function public.accept_invite(uuid) from public, anon;
grant execute on function public.accept_invite(uuid) to authenticated;

/** Switch the active org to one you belong to. */
create function public.set_active_org(p_org uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.memberships where org_id = p_org and user_id = auth.uid()) then return false; end if;
  insert into public.profiles (user_id, active_org_id) values (auth.uid(), p_org)
    on conflict (user_id) do update set active_org_id = excluded.active_org_id;
  return true;
end $$;
revoke execute on function public.set_active_org(uuid) from public, anon;
grant execute on function public.set_active_org(uuid) to authenticated;

-- 5. New sign-ups: owner membership records the email.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare org uuid;
begin
  insert into public.organizations (name) values ('My team') returning id into org;
  insert into public.memberships (org_id, user_id, email) values (org, new.id, lower(new.email));
  insert into public.lead_forms (org_id) values (org);
  return new;
end $$;

-- is_member() is no longer used by any policy; keep it callable only internally.
revoke execute on function private.is_member(uuid) from authenticated;
