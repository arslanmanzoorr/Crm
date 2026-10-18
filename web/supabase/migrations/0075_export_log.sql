-- Full team export: every download is written to the team's audit log (who, when, with or without files), and is
-- limited to 5 per person per hour. Only owners and admins of the active team may export.
create function public.log_export(p_files boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_org uuid := private.my_org();
begin
  if v_org is null or private.my_role() not in ('owner', 'admin') then return false; end if;
  if (select count(*) from public.audit_log
      where org_id = v_org and actor = auth.uid() and action = 'export' and ts > now() - interval '1 hour') >= 5 then
    return false;
  end if;
  insert into public.audit_log (org_id, actor, action, entity, after)
  values (v_org, auth.uid(), 'export', 'team', jsonb_build_object('files', p_files));
  return true;
end $$;
revoke execute on function public.log_export(boolean) from public, anon;
grant execute on function public.log_export(boolean) to authenticated;
