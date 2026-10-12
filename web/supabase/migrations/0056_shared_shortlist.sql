-- Collaborative shortlist: the client's saved homes, which the agent can add to; each side can leave a note.
alter table favorites
  add column added_by text not null default 'client' check (added_by in ('client', 'agent')),
  add column client_note text not null default '' check (length(client_note) <= 500),
  add column agent_note text not null default '' check (length(agent_note) <= 500);

create policy "active org adds" on favorites for insert with check (org_id = (select private.my_org()) and added_by = 'agent');
create policy "active org updates" on favorites for update
  using (org_id = (select private.my_org())) with check (org_id = (select private.my_org()));
create policy "active org removes" on favorites for delete using (org_id = (select private.my_org()));

-- The client's shortlist with who added each home and both notes.
create function public.portal_shortlist(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare l public.portal_links := private.portal_link(p_token);
begin
  if l.id is null then return null; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('property_id', f.property_id, 'added_by', f.added_by, 'client_note', f.client_note, 'agent_note', f.agent_note) order by f.created_at)
    from public.favorites f where f.contact_id = l.contact_id), '[]');
end $$;

-- The client's note on a saved home; the agent sees it on the lead's timeline too.
create function public.portal_note(p_token text, p_property uuid, p_text text) returns text
language plpgsql security definer set search_path = '' as $$
declare l public.portal_links := private.portal_link(p_token); v text := left(btrim(coalesce(p_text, '')), 500);
begin
  if l.id is null then return 'closed'; end if;
  update public.favorites set client_note = v where contact_id = l.contact_id and property_id = p_property;
  if not found then return 'invalid'; end if;
  if v <> '' then
    insert into public.activities (org_id, contact_id, user_id, channel, direction, content)
    select l.org_id, l.contact_id, null, 'Note', 'in', left('Note on ' || p.address || ' in the client portal: ' || v, 10000) from public.properties p where p.id = p_property;
  end if;
  return 'ok';
end $$;

revoke execute on function public.portal_shortlist(text), public.portal_note(text, uuid, text) from public;
grant execute on function public.portal_shortlist(text), public.portal_note(text, uuid, text) to anon, authenticated;

-- Agents' inserts don't pass org_id; default it to the active team like every other table.
alter table favorites alter column org_id set default private.my_org();
