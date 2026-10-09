-- Home-valuation page leads arrive as sellers with a clear intent (not the default buyer / "New web inquiry").
do $$
declare src text; out text;
begin
  select pg_get_functiondef('private.submit_lead_unkeyed(uuid, text, text, text, text, text, boolean, boolean, text)'::regprocedure) into src;
  out := replace(src,
    'insert into public.contacts (org_id, owner_id, name, email, phone, sources, consent_call, consent_sms, consent_email, intent)',
    'insert into public.contacts (org_id, owner_id, type, name, email, phone, sources, consent_call, consent_sms, consent_email, intent)');
  out := replace(out,
    'values (f.org_id, null, v_name,',
    'values (f.org_id, null, case when v_source = ''Home valuation'' then ''seller'' else ''buyer'' end, v_name,');
  out := replace(out,
    'coalesce(p_consent_email, false), ''New web inquiry'')',
    'coalesce(p_consent_email, false), case when v_source = ''Home valuation'' then ''Wants a home value'' else ''New web inquiry'' end)');
  if position('Wants a home value' in out) = 0 or position('then ''seller''' in out) = 0 then raise exception 'submit_lead_unkeyed: pattern not found'; end if;
  execute out;
end $$;
