-- Comparative market analyses: a subject home, agent-entered comps and the adjustment rates, saved per team.

create table cmas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default private.my_org() references organizations on delete cascade,
  property_id uuid,
  contact_id uuid,                     -- the seller it's for
  address text not null check (length(btrim(address)) between 1 and 300),
  subject jsonb not null check (jsonb_typeof(subject) = 'object'),       -- {sqft, beds, baths}
  comps jsonb not null default '[]' check (jsonb_typeof(comps) = 'array' and jsonb_array_length(comps) <= 30),
  rates jsonb not null check (jsonb_typeof(rates) = 'object'),           -- {perSqft, perBed, perBath}
  net jsonb not null check (jsonb_typeof(net) = 'object'),               -- {commissionPct, closingPct, payoff, concessions, other}
  list_price numeric check (list_price > 0 and list_price < 1e10),
  notes text not null default '' check (length(notes) <= 5000),       -- seller motivation, condition, timing
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (pg_column_size(comps) < 200000),
  foreign key (property_id, org_id) references properties (id, org_id) on delete set null (property_id),
  foreign key (contact_id, org_id) references contacts (id, org_id) on delete cascade
);
create index on cmas (org_id, updated_at desc);
alter table cmas enable row level security;
create policy "active org" on cmas for all
  using (org_id = (select private.my_org())) with check (org_id = (select private.my_org()));
