-- Storage deletes look the object up first, so without a SELECT policy "Remove logo" cleared the setting but left
-- the file behind. Owners/admins may now see their own team's logo objects (they are public images anyway).
create policy "admins read logo" on storage.objects for select to authenticated
  using (bucket_id = 'brand-logos' and private.can_brand(name));
