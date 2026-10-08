-- Tasks (the Workspace "day" view) and the AI's saved next-best-action per lead.

alter table contacts add column next_action text not null default '';

create table tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default my_org() references organizations on delete cascade,
  assignee_id uuid default auth.uid() references auth.users on delete set null,
  contact_id uuid references contacts on delete cascade,
  kind text not null default 'call' check (kind in ('call', 'video', 'email', 'showing', 'cma')),
  title text not null check (length(trim(title)) > 0),
  note text not null default '',
  due_at timestamptz not null,
  done boolean not null default false,
  created_by text not null default 'user' check (created_by in ('user', 'ai')),
  created_at timestamptz not null default now()
);
create index on tasks (org_id, done, due_at);

alter table tasks enable row level security;
create policy "org members" on tasks for all using (is_member(org_id)) with check (is_member(org_id));
