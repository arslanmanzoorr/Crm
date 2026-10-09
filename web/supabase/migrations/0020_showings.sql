-- Showings: a buyer seeing a home at a set time, then their feedback (which feeds the seller report).

alter table properties add column showing_notes text not null default '' check (length(showing_notes) <= 1000); -- lockbox, notice needed, pets

create table showings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default private.my_org() references organizations on delete cascade,
  contact_id uuid not null,                  -- the buyer
  property_id uuid,                          -- our listing, or
  address text not null default '' check (length(address) <= 300),
  agent_id uuid default auth.uid(),          -- who shows it
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'done', 'cancelled', 'no_show')),
  interest text check (interest in ('not_interested', 'maybe', 'interested', 'offer')),
  rating int check (rating between 1 and 5),
  feedback text not null default '' check (length(feedback) <= 2000),
  notes text not null default '' check (length(notes) <= 2000),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at - starts_at <= interval '4 hours'),
  check (property_id is not null or length(btrim(address)) > 0),
  foreign key (contact_id, org_id) references contacts (id, org_id) on delete cascade,
  foreign key (property_id, org_id) references properties (id, org_id) on delete cascade,
  foreign key (org_id, agent_id) references memberships (org_id, user_id) on delete set null (agent_id)
);
create index on showings (org_id, starts_at);
create index on showings (property_id);
create index on showings (contact_id);
alter table showings enable row level security;
create policy "active org" on showings for all
  using (org_id = (select private.my_org())) with check (org_id = (select private.my_org()));
