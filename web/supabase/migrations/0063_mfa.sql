-- Two-factor login (TOTP). Once a user has a verified authenticator app, their session only reaches team data at
-- assurance level aal2 (password + code). Enforced in the database: my_org() and is_member() return nothing
-- for an aal1 session of an enrolled user, so every org-scoped RLS policy and RPC refuses it.
create function private.mfa_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
$$;

create or replace function private.my_org() returns uuid
language sql stable security definer set search_path = '' as $$
  select m.org_id from public.memberships m
  left join public.profiles p on p.user_id = m.user_id
  where m.user_id = auth.uid() and private.mfa_ok()
  order by (m.org_id = p.active_org_id) desc nulls last, m.created_at, m.org_id
  limit 1
$$;

create or replace function private.is_member(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.mfa_ok() and exists (select 1 from public.memberships where org_id = org and user_id = auth.uid())
$$;

alter policy "my orgs" on public.organizations using (
  (select private.mfa_ok()) and exists (select 1 from public.memberships m where m.org_id = organizations.id and m.user_id = (select auth.uid()))
);
