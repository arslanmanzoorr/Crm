-- New agents get a first-two-weeks checklist as tasks when they join a team (not owners creating their own team).

create function private.onboard_member() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role not in ('agent', 'admin') then return null; end if;
  insert into public.tasks (org_id, contact_id, assignee_id, kind, title, note, due_at, created_by)
  select new.org_id, null, new.user_id, t.kind, t.title, t.note, now() + make_interval(days => t.d), 'system'
  from (values
    ('email', 'Welcome: set up your account', 'Account page: check your details. Your lead form link is there too.', 0),
    ('call', 'Learn the Today screen', 'Overdue tasks, hot leads, deals that need you and buying signals all land there each morning.', 1),
    ('email', 'Turn on your client portal habit', 'Open a client''s page and create their private portal link, so they can follow along.', 2),
    ('showing', 'Shadow a showing or open house', 'Ask a teammate which one to join this week.', 5),
    ('call', 'Call your first 10 leads', 'Leads page: filter to yours. Log every call so your scorecard counts it.', 7),
    ('cma', 'Run your first CMA', 'Market analyses: pick a listing or a past client''s home and practice.', 10),
    ('call', 'Two-week check-in with your broker', 'Bring questions and your Analytics scorecard.', 14)
  ) as t(kind, title, note, d);
  return null;
end $$;
create trigger onboard after insert on memberships for each row execute function private.onboard_member();
