-- submit_lead may only be called by the app server (which runs the honeypot, timing and IP hashing).
-- The server holds FORM_RPC_KEY; the database only stores its SHA-256.
-- Per environment, after this migration:
--   insert into private.app_secrets values ('form_rpc', '<sha256 hex of FORM_RPC_KEY>');

create table private.app_secrets (
  name text primary key,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$')
);

create function private.key_ok(p_name text, p_key text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.app_secrets
    where name = p_name and sha256 = encode(sha256(convert_to(coalesce(p_key, ''), 'UTF8')), 'hex')
  )
$$;

-- The 0007 function moves to private (unreachable over the API); the public one checks the key, then calls it.
alter function public.submit_lead(uuid, text, text, text, text, text, boolean, boolean, text) rename to submit_lead_unkeyed;
revoke execute on function public.submit_lead_unkeyed(uuid, text, text, text, text, text, boolean, boolean, text) from anon, authenticated;
alter function public.submit_lead_unkeyed(uuid, text, text, text, text, text, boolean, boolean, text) set schema private;

create function public.submit_lead(
  p_key text, p_form uuid, p_ip_hash text, p_name text, p_email text, p_phone text, p_message text,
  p_consent_call_sms boolean, p_consent_email boolean, p_source text
) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if not private.key_ok('form_rpc', p_key) then return 'forbidden'; end if;
  return private.submit_lead_unkeyed(p_form, p_ip_hash, p_name, p_email, p_phone, p_message, p_consent_call_sms, p_consent_email, p_source);
end $$;
revoke execute on function public.submit_lead(text, uuid, text, text, text, text, text, boolean, boolean, text) from public;
grant execute on function public.submit_lead(text, uuid, text, text, text, text, text, boolean, boolean, text) to anon, authenticated;
