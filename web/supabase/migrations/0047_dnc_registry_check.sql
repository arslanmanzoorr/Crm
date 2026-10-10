-- FSBO / cold prospecting: when the agent last checked the lead's number against the National Do Not Call
-- Registry. A check within 31 days (the FTC scrub window) allows hand-dialed calls without prior consent.
-- Texts still need consent. Never allowed when the lead is marked do-not-contact.
alter table contacts add column dnc_checked_on date;
alter table contacts add constraint contacts_dnc_checked_on_check check (dnc_checked_on <= '2100-01-01');
-- (A "not in the future" check would need current_date, which constraints can't use; the server action sets today.)
