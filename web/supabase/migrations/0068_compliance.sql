-- Compliance settings per team. Calling hours default to the federal telemarketing window (8am to 9pm,
-- 47 CFR 64.1200(c)(1)); a team may narrow it for stricter states but never widen it. Recording consent is the
-- team's call: when on, the app reminds agents to get every party's consent before recording a call.
alter table public.organizations
  add column call_start smallint not null default 8 check (call_start between 8 and 20),
  add column call_end smallint not null default 21 check (call_end between 9 and 21),
  add column recording_all_party boolean not null default false,
  add constraint organizations_call_window check (call_end > call_start);
