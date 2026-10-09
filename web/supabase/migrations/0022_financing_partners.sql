-- Referral partners (lenders, inspectors, title, ...) and each buyer's financing readiness.

create table partners (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default private.my_org() references organizations on delete cascade,
  kind text not null check (kind in ('lender', 'inspector', 'title', 'attorney', 'insurance', 'contractor', 'appraiser', 'other')),
  name text not null check (length(btrim(name)) between 1 and 200),
  company text not null default '' check (length(company) <= 200),
  email text check (email is null or length(email) <= 320),
  phone text check (phone is null or length(phone) <= 30),
  notes text not null default '' check (length(notes) <= 2000),
  created_at timestamptz not null default now(),
  unique (id, org_id)
);
create index on partners (org_id, kind);
alter table partners enable row level security;
create policy "active org" on partners for all
  using (org_id = (select private.my_org())) with check (org_id = (select private.my_org()));

create table financing (
  contact_id uuid primary key,
  org_id uuid not null default private.my_org(),
  cash boolean not null default false,
  lender_id uuid,
  stage text not null default 'not_started' check (stage in ('not_started', 'preapproved', 'application', 'processing', 'underwriting', 'conditional', 'clear_to_close', 'funded')),
  preapproval_amount numeric check (preapproval_amount > 0 and preapproval_amount < 1e10),
  preapproval_expires date,
  docs text[] not null default '{}' check (docs <@ array['pay_stubs', 'w2', 'tax_returns', 'bank_statements', 'id', 'gift_letter']::text[]),
  gift_funds boolean not null default false,
  updated_at timestamptz not null default now(),
  foreign key (contact_id, org_id) references contacts (id, org_id) on delete cascade,
  foreign key (lender_id, org_id) references partners (id, org_id) on delete set null (lender_id)
);
create index on financing (lender_id);
alter table financing enable row level security;
create policy "active org" on financing for all
  using (org_id = (select private.my_org())) with check (org_id = (select private.my_org()));
