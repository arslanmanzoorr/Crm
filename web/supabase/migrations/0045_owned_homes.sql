-- Homes a client owns (their home, rentals, past purchases), for equity check-ins and investor portfolios.

create table owned_homes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default private.my_org(),
  contact_id uuid not null,
  address text not null check (length(btrim(address)) between 1 and 300),
  purchase_price numeric check (purchase_price > 0 and purchase_price < 1e10),
  purchased_on date,
  value_estimate numeric check (value_estimate > 0 and value_estimate < 1e10),
  loan_balance numeric not null default 0 check (loan_balance >= 0 and loan_balance < 1e10),
  monthly_rent numeric not null default 0 check (monthly_rent >= 0 and monthly_rent < 1e8),
  monthly_costs numeric not null default 0 check (monthly_costs >= 0 and monthly_costs < 1e8),
  notes text not null default '' check (length(notes) <= 2000),
  updated_at timestamptz not null default now(),
  foreign key (contact_id, org_id) references contacts (id, org_id) on delete cascade
);
create index on owned_homes (contact_id, org_id);
alter table owned_homes enable row level security;
create policy "active org" on owned_homes for all
  using (org_id = (select private.my_org())) with check (org_id = (select private.my_org()));
