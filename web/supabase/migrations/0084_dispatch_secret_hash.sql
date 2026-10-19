-- The dispatcher secret can also be registered by its SHA-256 hash, so the database never needs the raw value
-- (the raw value is still needed in Vault only for the every-minute wake-up call, which sends it as a header).
create table private.config (key text primary key, value text not null);
revoke all on private.config from public, anon, authenticated;

create or replace function private.dispatch_ok(p_secret text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(length(p_secret) >= 32 and (
    p_secret = (select decrypted_secret from vault.decrypted_secrets where name = 'email_dispatch_secret')
    or encode(extensions.digest(p_secret, 'sha256'), 'hex') = (select value from private.config where key = 'email_dispatch_sha256')
  ), false)
$$;
revoke execute on function private.dispatch_ok(text) from public, anon, authenticated;
