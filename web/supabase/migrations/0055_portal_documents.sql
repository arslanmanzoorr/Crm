-- Secure document sharing: the agent marks a document "shared with client"; the client sees and downloads it in
-- their portal. Visible only through that client's own portal link, and only documents on their lead, their deals
-- or a listing they're the seller of.
alter table documents add column shared_with_client boolean not null default false;

create function private.portal_docs(l public.portal_links) returns setof public.documents
language sql stable security definer set search_path = '' as $$
  select d.* from public.documents d
  where d.org_id = l.org_id and d.shared_with_client and (
    d.contact_id = l.contact_id
    or d.deal_id in (select id from public.deals where contact_id = l.contact_id)
    or d.property_id in (select id from public.properties where seller_id = l.contact_id))
$$;
revoke execute on function private.portal_docs(public.portal_links) from public;

create function public.portal_documents(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare l public.portal_links := private.portal_link(p_token);
begin
  if l.id is null then return null; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'size', d.size, 'created_at', d.created_at) order by d.created_at desc)
    from private.portal_docs(l) d), '[]');
end $$;

-- The storage path of one shared document, logged on the client's timeline.
create function public.portal_document(p_token text, p_doc uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare l public.portal_links := private.portal_link(p_token); d public.documents;
begin
  if l.id is null then return null; end if;
  select * into d from private.portal_docs(l) x where x.id = p_doc;
  if d.id is null then return null; end if;
  insert into public.activities (org_id, contact_id, user_id, channel, direction, content)
  values (l.org_id, l.contact_id, null, 'Note', 'in', left('Downloaded ' || d.name || ' in the client portal', 10000));
  return jsonb_build_object('path', d.path, 'name', d.name, 'mime', d.mime);
end $$;

revoke execute on function public.portal_documents(text), public.portal_document(text, uuid) from public;
grant execute on function public.portal_documents(text), public.portal_document(text, uuid) to anon, authenticated;

-- The download route reads as anon: only files of documents currently shared with a client (paths are random).
create function feed.shared_doc_ok(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.documents d where d.path = p_path and d.shared_with_client)
$$;
revoke execute on function feed.shared_doc_ok(text) from public;
grant execute on function feed.shared_doc_ok(text) to anon;
create policy "shared with client" on storage.objects for select to anon
  using (bucket_id = 'documents' and feed.shared_doc_ok(name));
