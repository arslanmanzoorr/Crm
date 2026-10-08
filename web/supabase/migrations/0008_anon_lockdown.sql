-- Signed-out visitors never touch tables directly. Their only entry points are
-- public.submit_lead and public.lead_form_info (granted in 0007).
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
