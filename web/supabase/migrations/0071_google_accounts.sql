-- Google connection per user (Gmail send + Calendar events). The refresh token is stored only encrypted with a
-- server-side key (GOOGLE_TOKEN_KEY), so even a leaked row is useless. Users see and remove only their own row.
create table public.google_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null check (length(email) <= 320),
  token_enc text not null check (length(token_enc) <= 4000),
  scopes text not null default '' check (length(scopes) <= 2000),
  connected_at timestamptz not null default now()
);
alter table public.google_accounts enable row level security;
create policy "own row" on public.google_accounts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Events this app created on someone's Google Calendar, so a moved or cancelled showing updates the same event.
alter table public.showings add column google_event_id text check (length(google_event_id) <= 1024);
