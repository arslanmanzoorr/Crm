-- Multi-market offices: an office can run on its own time zone. Members in that office see "today", due dates
-- and deadlines in the office's zone; everyone else uses the team's.
alter table public.offices add column time_zone text check (time_zone ~ '^[A-Za-z]+(/[A-Za-z_+-]+){1,2}$');
