-- Starting an agency brings the founder's own team in as its first sub-account (only a team they own, and only if
-- it isn't in an agency yet), so their setup can be saved as a snapshot right away.
create or replace function public.create_agency(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_org uuid := private.my_org();
begin
  if auth.uid() is null or not private.mfa_ok() then raise exception 'not allowed'; end if;
  if (select count(*) from public.agency_members where user_id = auth.uid() and role = 'owner') >= 3 then raise exception 'limit'; end if;
  insert into public.agencies (name) values (left(btrim(p_name), 80)) returning id into v_id;
  insert into public.agency_members (agency_id, user_id, role, email) values (v_id, auth.uid(), 'owner', lower(auth.jwt() ->> 'email'));
  if private.my_role() = 'owner' then
    update public.organizations set agency_id = v_id where id = v_org and agency_id is null;
  end if;
  return v_id;
end $$;
