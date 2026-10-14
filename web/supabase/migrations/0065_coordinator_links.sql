-- Transaction coordinator link: an outside coordinator works ONE deal without a team login. Like the client
-- portal, the link carries a 256-bit secret and only its SHA-256 is stored. Through it they see that deal's
-- milestones and documents, can tick milestones off, and can download the deal's files. Nothing else.
create table public.deal_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default private.my_org(),
  deal_id uuid not null,
  label text not null default 'Coordinator' check (length(label) between 1 and 80),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '180 days',
  revoked_at timestamptz,
  last_seen_at timestamptz,
  foreign key (deal_id, org_id) references public.deals (id, org_id) on delete cascade
);
create index deal_links_deal_idx on public.deal_links (deal_id);
create index deal_links_created_by_idx on public.deal_links (created_by);
alter table public.deal_links enable row level security;
create policy "active org" on public.deal_links for all to authenticated
  using (org_id = (select private.my_org())) with check (org_id = (select private.my_org()));

create function private.deal_link(p_token text) returns public.deal_links
language sql stable security definer set search_path = '' as $$
  select l.* from public.deal_links l
  where p_token ~ '^[A-Za-z0-9_-]{43}$'
    and l.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and l.revoked_at is null and l.expires_at > now()
$$;

create function public.tc_view(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare l public.deal_links := private.deal_link(p_token);
begin
  if l.id is null then return null; end if;
  update public.deal_links set last_seen_at = now() where id = l.id;
  return (select jsonb_build_object(
    'label', l.label,
    'team', coalesce((select f.public_name from public.lead_forms f where f.org_id = d.org_id order by f.created_at limit 1), (select o.name from public.organizations o where o.id = d.org_id)),
    'agent_email', (select m.email from public.memberships m where m.org_id = d.org_id and m.user_id = d.owner_id),
    'address', coalesce(p.address, d.address), 'side', d.side, 'status', d.status, 'accepted_on', d.accepted_on, 'close_on', d.close_on,
    'client', c.name,
    'milestones', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'title', m.title, 'due_on', m.due_on, 'done', m.done_at is not null)
        order by m.due_on nulls last, m.position) from public.deal_milestones m where m.deal_id = d.id), '[]'),
    'documents', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'size', x.size, 'created_at', x.created_at) order by x.created_at desc)
        from public.documents x where x.deal_id = d.id), '[]'))
    from public.deals d left join public.properties p on p.id = d.property_id left join public.contacts c on c.id = d.contact_id
    where d.id = l.deal_id);
end $$;

-- Tick a milestone on or off; logged on the client's timeline so the agent sees who did it.
create function public.tc_milestone(p_token text, p_milestone uuid, p_done boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare l public.deal_links := private.deal_link(p_token); m public.deal_milestones;
begin
  if l.id is null then return false; end if;
  select * into m from public.deal_milestones where id = p_milestone and deal_id = l.deal_id;
  if m.id is null then return false; end if;
  update public.deal_milestones set done_at = case when p_done then coalesce(done_at, now()) else null end where id = m.id;
  insert into public.activities (org_id, contact_id, user_id, channel, direction, content)
  select l.org_id, d.contact_id, null, 'Note', 'in', left(l.label || (case when p_done then ' completed: ' else ' reopened: ' end) || m.title, 10000)
  from public.deals d where d.id = l.deal_id;
  return true;
end $$;

create function public.tc_document(p_token text, p_doc uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare l public.deal_links := private.deal_link(p_token); x public.documents;
begin
  if l.id is null then return null; end if;
  select * into x from public.documents where id = p_doc and deal_id = l.deal_id;
  if x.id is null then return null; end if;
  return jsonb_build_object('path', x.path, 'name', x.name, 'mime', x.mime);
end $$;

revoke execute on function private.deal_link(text) from public, anon, authenticated;
revoke execute on function public.tc_view(text), public.tc_milestone(text, uuid, boolean), public.tc_document(text, uuid) from public;
grant execute on function public.tc_view(text), public.tc_milestone(text, uuid, boolean), public.tc_document(text, uuid) to anon, authenticated;
