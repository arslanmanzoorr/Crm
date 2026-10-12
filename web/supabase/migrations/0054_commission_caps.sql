-- Commission plan caps: the most an agent pays the brokerage in a calendar year; past it, new deals suggest 100%.
alter table memberships add column annual_cap numeric(12,2) check (annual_cap > 0 and annual_cap < 1e9);

create function public.set_annual_cap(p_user uuid, p_cap numeric) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select private.my_role()) not in ('owner', 'admin') then raise exception 'Only owners and admins can set commission caps'; end if;
  if p_cap is not null and (p_cap <= 0 or p_cap >= 1e9) then raise exception 'Cap must be a positive amount'; end if;
  update public.memberships set annual_cap = p_cap where org_id = (select private.my_org()) and user_id = p_user;
end $$;
revoke execute on function public.set_annual_cap(uuid, numeric) from public, anon;
grant execute on function public.set_annual_cap(uuid, numeric) to authenticated;
