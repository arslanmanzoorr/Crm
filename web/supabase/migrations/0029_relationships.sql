-- Relationships between contacts (household, family, friends, colleagues). One row per pair, stored with the
-- smaller id first so a link exists once and reads the same from both sides.

create table contact_links (
  org_id uuid not null default private.my_org(),
  a uuid not null,
  b uuid not null,
  kind text not null check (kind in ('household', 'family', 'friend', 'colleague', 'other')),
  note text not null default '' check (length(note) <= 200),
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b),
  foreign key (a, org_id) references contacts (id, org_id) on delete cascade,
  foreign key (b, org_id) references contacts (id, org_id) on delete cascade
);
create index on contact_links (b);
alter table contact_links enable row level security;
create policy "active org" on contact_links for all
  using (org_id = (select private.my_org())) with check (org_id = (select private.my_org()));
