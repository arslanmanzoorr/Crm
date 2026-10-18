-- Lead watchdog: know which leads came in on their own (forms, open house sign-in, showing booking, client portal,
-- API) so response time is measured on those only. Leads an agent types or imports are not "waiting" on anyone.
-- A row is inbound when it is created without a signed-in user, which is exactly the public RPC path.
alter table public.contacts add column inbound boolean not null default false;

-- Existing rows: inbound if the system opened a speed-to-lead or open-house follow-up task for them.
update public.contacts c set inbound = true
where exists (select 1 from public.tasks t where t.contact_id = c.id and t.created_by = 'system');

alter table public.contacts alter column inbound set default (auth.uid() is null);

create index contacts_waiting on public.contacts (org_id, created_at desc) where inbound and first_response_at is null;
