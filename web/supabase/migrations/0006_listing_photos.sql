-- Listing photos: private bucket, org-scoped paths, ordered media rows.

-- Bucket limits are enforced by Storage itself, whatever the client sends.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', false, 15 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

-- Objects live at <org_id>/<property_id>/<file>. Membership is checked on the first path segment,
-- compared as text so a malformed path fails the check instead of erroring.
create function private.member_of_folder(path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid() and org_id::text = split_part(path, '/', 1)
  )
$$;
grant execute on function private.member_of_folder(text) to authenticated;

create policy "org members read listing photos" on storage.objects for select to authenticated
  using (bucket_id = 'listing-photos' and private.member_of_folder(name));
create policy "org members upload listing photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos' and private.member_of_folder(name));
create policy "org members delete listing photos" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and private.member_of_folder(name));

alter table properties add constraint properties_id_org_key unique (id, org_id);

create table property_media (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default private.my_org() references organizations on delete cascade,
  property_id uuid not null,
  path text not null unique check (length(path) <= 300),
  position int not null default 0,
  is_ai_altered boolean not null default false, -- MLS / CA AB 723: altered images must be labeled
  created_at timestamptz not null default now(),
  foreign key (property_id, org_id) references properties (id, org_id) on delete cascade,
  -- A row can only point at an object inside its own org's folder.
  constraint property_media_path_in_org check (split_part(path, '/', 1) = org_id::text and split_part(path, '/', 2) = property_id::text)
);
create index on property_media (property_id, position);
create index on property_media (org_id);

alter table property_media enable row level security;
create policy "org members" on property_media for all using (private.is_member(org_id)) with check (private.is_member(org_id));
