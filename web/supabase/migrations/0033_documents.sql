-- Documents (disclosures, contracts, inspection reports) on listings, deals and leads.
-- Private bucket; Storage enforces size and type; objects live at <org_id>/<uuid>/<file>; downloads are short-lived signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 25 * 1024 * 1024, array[
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);

create policy "org members read documents" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and private.member_of_folder(name));
create policy "org members upload documents" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and private.member_of_folder(name));
create policy "org members delete documents" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and private.member_of_folder(name));

create table documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default private.my_org() references organizations on delete cascade,
  property_id uuid,
  deal_id uuid,
  contact_id uuid,
  name text not null check (length(btrim(name)) between 1 and 200),
  path text not null unique check (length(path) <= 400),
  size bigint not null check (size > 0 and size <= 25 * 1024 * 1024),
  mime text not null check (length(mime) <= 120),
  uploaded_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  check (num_nonnulls(property_id, deal_id, contact_id) >= 1),
  constraint documents_path_in_org check (split_part(path, '/', 1) = org_id::text),
  foreign key (property_id, org_id) references properties (id, org_id) on delete cascade,
  foreign key (deal_id, org_id) references deals (id, org_id) on delete cascade,
  foreign key (contact_id, org_id) references contacts (id, org_id) on delete cascade
);
create index on documents (property_id);
create index on documents (deal_id);
create index on documents (contact_id);
alter table documents enable row level security;
create policy "active org" on documents for all
  using (org_id = (select private.my_org())) with check (org_id = (select private.my_org()));
