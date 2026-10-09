-- The app needs to know which org is active (for the team page and org switcher).
-- Returns only the caller's own active org id.
create function public.active_org() returns uuid
language sql stable security invoker set search_path = '' as $$ select private.my_org() $$;
revoke execute on function public.active_org() from public, anon;
grant execute on function public.active_org() to authenticated;

-- Re-opening an invite you already accepted takes you to that team instead of an error.
create or replace function public.accept_invite(p_token uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  i public.invites;
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then return 'signin'; end if;
  select * into i from public.invites where id = p_token for update;
  if i.id is null then return 'invalid'; end if;
  if i.accepted_at is not null then
    if exists (select 1 from public.memberships where org_id = i.org_id and user_id = auth.uid()) then
      insert into public.profiles (user_id, active_org_id) values (auth.uid(), i.org_id)
        on conflict (user_id) do update set active_org_id = excluded.active_org_id;
      return 'ok';
    end if;
    return 'used';
  end if;
  if i.expires_at < now() then return 'expired'; end if;
  if i.email <> v_email then return 'wrong_email'; end if;
  insert into public.memberships (org_id, user_id, role, email) values (i.org_id, auth.uid(), i.role, v_email)
    on conflict (org_id, user_id) do nothing;
  update public.invites set accepted_at = now() where id = i.id;
  insert into public.profiles (user_id, active_org_id) values (auth.uid(), i.org_id)
    on conflict (user_id) do update set active_org_id = excluded.active_org_id;
  return 'ok';
end $$;
