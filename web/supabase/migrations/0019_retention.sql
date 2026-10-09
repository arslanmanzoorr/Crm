-- Lifetime Client Engine: who referred whom, review requests per closed deal, testimonials with publishing consent.

alter table contacts add column referred_by uuid;
alter table contacts add constraint contacts_referred_by_same_org
  foreign key (referred_by, org_id) references contacts (id, org_id) on delete set null (referred_by);
alter table contacts add constraint contacts_not_self_referred check (referred_by is null or referred_by <> id);
create index on contacts (referred_by) where referred_by is not null;

alter table deals add column review_asked_at timestamptz;

create table testimonials (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default private.my_org(),
  contact_id uuid not null,
  deal_id uuid,
  body text not null check (length(btrim(body)) between 1 and 2000),
  rating int check (rating between 1 and 5),
  publish_ok boolean not null default false, -- the client agreed it can be shown publicly (FTC endorsement rules)
  received_on date not null default current_date,
  created_at timestamptz not null default now(),
  foreign key (contact_id, org_id) references contacts (id, org_id) on delete cascade,
  foreign key (deal_id, org_id) references deals (id, org_id) on delete set null (deal_id)
);
create index on testimonials (contact_id);
alter table testimonials enable row level security;
create policy "active org" on testimonials for all
  using (org_id = (select private.my_org())) with check (org_id = (select private.my_org()));

-- Where clients leave reviews (Google, Zillow, ...). Owners and admins set it; review requests link to it.
alter table organizations add column review_url text check (review_url is null or (review_url ~ '^https://' and length(review_url) <= 500));
