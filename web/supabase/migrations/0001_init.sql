-- EstateOS Phase 0: multi-tenant orgs, contacts (leads), properties, activities.
-- Run once in Supabase → SQL Editor (or `supabase db push`).

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'solo',
  created_at timestamptz not null default now()
);

create table memberships (
  org_id uuid not null references organizations on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'agent', 'assistant')),
  primary key (org_id, user_id)
);

-- The caller's org. Used as the column default so inserts don't pass org_id.
-- ponytail: one org per user; pick the active org from a cookie when multi-org users exist.
create function my_org() returns uuid
language sql stable security definer set search_path = '' as $$
  select org_id from public.memberships where user_id = auth.uid() limit 1
$$;

create function is_member(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships where org_id = org and user_id = auth.uid())
$$;

create table contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default my_org() references organizations on delete cascade,
  owner_id uuid default auth.uid() references auth.users on delete set null,
  type text not null default 'buyer' check (type in ('buyer', 'seller', 'renter', 'investor', 'landlord', 'vendor')),
  name text not null check (length(trim(name)) > 0),
  email text,
  phone text,
  sources text[] not null default '{}',
  stage text not null default 'New' check (stage in ('New', 'Contacted', 'Qualified', 'Showing', 'Offer', 'Under Contract', 'Closed', 'Lost')),
  score int not null default 50 check (score between 0 and 100),
  intent text not null default '',
  budget text not null default '',
  areas text[] not null default '{}',
  preferences text[] not null default '{}',
  consent_sms boolean not null default false,
  consent_call boolean not null default false,
  consent_email boolean not null default false,
  dnc boolean not null default false,
  created_at timestamptz not null default now()
);

create table properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default my_org() references organizations on delete cascade,
  mls_id text,
  address text not null check (length(trim(address)) > 0),
  area text not null default '',
  price numeric not null check (price >= 0),
  beds int not null default 0,
  baths numeric not null default 0,
  sqft int not null default 0,
  status text not null default 'Active' check (status in ('Active', 'Coming soon', 'Under contract', 'Sold')),
  features text[] not null default '{}',
  description text not null default '',
  created_at timestamptz not null default now()
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default my_org() references organizations on delete cascade,
  contact_id uuid not null references contacts on delete cascade,
  user_id uuid default auth.uid() references auth.users on delete set null,
  channel text not null check (channel in ('Call', 'SMS', 'WhatsApp', 'Email', 'Instagram', 'Note')),
  direction text not null default 'out' check (direction in ('in', 'out')),
  content text not null,
  ts timestamptz not null default now()
);
create index on activities (contact_id, ts desc);
create index on contacts (org_id);
create index on properties (org_id);

alter table organizations enable row level security;
alter table memberships enable row level security;
alter table contacts enable row level security;
alter table properties enable row level security;
alter table activities enable row level security;

create policy "members read org" on organizations for select using (is_member(id));
create policy "read own memberships" on memberships for select using (user_id = auth.uid());
create policy "org members" on contacts for all using (is_member(org_id)) with check (is_member(org_id));
create policy "org members" on properties for all using (is_member(org_id)) with check (is_member(org_id));
create policy "org members" on activities for all using (is_member(org_id)) with check (is_member(org_id));

-- Every new sign-up gets its own org as owner.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare org uuid;
begin
  insert into public.organizations (name) values (coalesce(split_part(new.email, '@', 1), 'My') || '''s team') returning id into org;
  insert into public.memberships (org_id, user_id) values (org, new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Not callable over the API: the trigger runs it; helpers are for signed-in RLS checks only.
revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function my_org() from public, anon;
revoke execute on function is_member(uuid) from public, anon;
