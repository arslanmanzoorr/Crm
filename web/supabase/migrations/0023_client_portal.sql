-- Client portal: a private link per client (buyer or seller) to follow their journey. Clients aren't app users:
-- the link carries a 256-bit secret, only its SHA-256 is stored, and every read/write goes through the
-- security-definer functions below, which return that one client's curated view and nothing else.

alter table properties add column seller_id uuid;
alter table properties add constraint properties_seller_same_org
  foreign key (seller_id, org_id) references contacts (id, org_id) on delete set null (seller_id);
create index on properties (seller_id) where seller_id is not null;

create table portal_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default private.my_org(),
  contact_id uuid not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '180 days',
  revoked_at timestamptz,
  last_seen_at timestamptz,
  foreign key (contact_id, org_id) references contacts (id, org_id) on delete cascade
);
create index on portal_links (contact_id);
alter table portal_links enable row level security;
create policy "active org" on portal_links for all
  using (org_id = (select private.my_org())) with check (org_id = (select private.my_org()));

create table favorites (
  contact_id uuid not null,
  property_id uuid not null,
  org_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (contact_id, property_id),
  foreign key (contact_id, org_id) references contacts (id, org_id) on delete cascade,
  foreign key (property_id, org_id) references properties (id, org_id) on delete cascade
);
alter table favorites enable row level security;
create policy "active org reads" on favorites for select using (org_id = (select private.my_org()));

-- The link behind a token, if it's live. Hashing happens here so the raw token never touches a table.
create function private.portal_link(p_token text) returns public.portal_links
language sql stable security definer set search_path = '' as $$
  select l.* from public.portal_links l
  where p_token ~ '^[A-Za-z0-9_-]{43}$'
    and l.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and l.revoked_at is null and l.expires_at > now()
$$;
revoke execute on function private.portal_link(text) from public, anon, authenticated;

create function public.portal_view(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  l public.portal_links;
  c public.contacts;
  out jsonb;
begin
  l := private.portal_link(p_token);
  if l.id is null then return null; end if;
  update public.portal_links set last_seen_at = now() where id = l.id;
  select * into c from public.contacts where id = l.contact_id;

  select jsonb_build_object(
    'first_name', split_part(c.name, ' ', 1),
    'type', c.type,
    'criteria', jsonb_build_object('budget', c.budget, 'areas', c.areas, 'preferences', c.preferences),
    'team', coalesce((select f.public_name from public.lead_forms f where f.org_id = c.org_id order by f.created_at limit 1), (select o.name from public.organizations o where o.id = c.org_id)),
    'agent_email', (select m.email from public.memberships m where m.org_id = c.org_id and m.user_id = c.owner_id),
    'showings', coalesce((select jsonb_agg(jsonb_build_object('starts_at', s.starts_at, 'status', s.status, 'address', coalesce(p.address, s.address)) order by s.starts_at desc)
        from public.showings s left join public.properties p on p.id = s.property_id
        where s.contact_id = c.id and s.status in ('requested', 'confirmed', 'done')), '[]'),
    'offers', coalesce((select jsonb_agg(jsonb_build_object('address', coalesce(p.address, o.address), 'amount', o.amount, 'status', o.status,
          'updated', (select max(e.ts) from public.offer_events e where e.offer_id = o.id)) order by o.created_at desc)
        from public.offers o left join public.properties p on p.id = o.property_id
        where o.contact_id = c.id and o.side = 'buyer' and o.status <> 'draft'), '[]'),
    'deals', coalesce((select jsonb_agg(jsonb_build_object('address', coalesce(p.address, d.address), 'side', d.side, 'status', d.status, 'close_on', d.close_on,
          'milestones', coalesce((select jsonb_agg(jsonb_build_object('title', m.title, 'due_on', m.due_on, 'done', m.done_at is not null) order by m.due_on nulls last, m.position)
            from public.deal_milestones m where m.deal_id = d.id), '[]')) order by d.created_at desc)
        from public.deals d left join public.properties p on p.id = d.property_id
        where d.contact_id = c.id and d.status in ('active', 'closed')), '[]'),
    'financing', (select jsonb_build_object('cash', f.cash, 'stage', f.stage, 'preapproval_expires', f.preapproval_expires, 'docs', f.docs, 'gift_funds', f.gift_funds)
        from public.financing f where f.contact_id = c.id),
    'favorites', coalesce((select jsonb_agg(v.property_id) from public.favorites v where v.contact_id = c.id), '[]'),
    'listings', case when c.type in ('buyer', 'investor', 'renter') then coalesce((select jsonb_agg(jsonb_build_object(
          'id', p.id, 'address', p.address, 'area', p.area, 'price', p.price, 'beds', p.beds, 'baths', p.baths, 'sqft', p.sqft, 'status', p.status, 'features', p.features))
        from public.properties p where p.org_id = c.org_id and p.status in ('Active', 'Coming soon')), '[]') else '[]' end,
    -- Seller report: their listings' activity. Buyers stay anonymous.
    'selling', coalesce((select jsonb_agg(jsonb_build_object(
          'address', p.address, 'price', p.price, 'status', p.status, 'days_on_market', now()::date - p.created_at::date,
          'showings', (select count(*) from public.showings s where s.property_id = p.id and s.status in ('confirmed', 'done')),
          'feedback', coalesce((select jsonb_agg(jsonb_build_object('interest', s.interest, 'rating', s.rating, 'feedback', s.feedback, 'date', s.starts_at::date) order by s.starts_at desc)
            from public.showings s where s.property_id = p.id and s.interest is not null), '[]'),
          'open_house_visitors', (select count(*) from public.open_house_visits v join public.open_houses o on o.id = v.open_house_id where o.property_id = p.id),
          'open_house_feedback', coalesce((select jsonb_agg(jsonb_build_object('rating', v.rating, 'feedback', v.feedback, 'date', v.ts::date) order by v.ts desc)
            from public.open_house_visits v join public.open_houses o on o.id = v.open_house_id where o.property_id = p.id and (v.rating is not null or v.feedback <> '')), '[]'),
          'offers', coalesce((select jsonb_agg(jsonb_build_object('amount', o.amount, 'financing', o.financing, 'contingencies', cardinality(o.contingencies),
              'close_on', o.close_on, 'status', o.status, 'seller_credit', o.seller_credit) order by o.amount desc)
            from public.offers o where o.property_id = p.id and o.side = 'seller'), '[]')))
        from public.properties p where p.seller_id = c.id), '[]')
  ) into out;
  return out;
end $$;
revoke execute on function public.portal_view(text) from public;
grant execute on function public.portal_view(text) to anon, authenticated;

-- A message from the client: lands on their timeline and becomes a reply task for their agent.
create function public.portal_message(p_token text, p_text text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  l public.portal_links;
  v_text text := left(btrim(regexp_replace(coalesce(p_text, ''), '[<>]', '', 'g')), 2000);
  v_owner uuid;
begin
  l := private.portal_link(p_token);
  if l.id is null then return 'closed'; end if;
  if length(v_text) = 0 then return 'invalid'; end if;
  if (select count(*) from public.activities where contact_id = l.contact_id and content like 'Portal message:%' and ts > now() - interval '1 hour') >= 10 then
    return 'limited';
  end if;
  insert into public.activities (org_id, contact_id, user_id, channel, direction, content)
  values (l.org_id, l.contact_id, null, 'Note', 'in', 'Portal message: ' || v_text);
  select owner_id into v_owner from public.contacts where id = l.contact_id;
  if not exists (select 1 from public.tasks where contact_id = l.contact_id and title = 'Reply to portal message' and not done) then
    insert into public.tasks (org_id, contact_id, assignee_id, kind, title, note, due_at, created_by)
    values (l.org_id, l.contact_id, v_owner, 'call', 'Reply to portal message', left(v_text, 300), now() + interval '1 hour', 'system');
  end if;
  return 'ok';
end $$;
revoke execute on function public.portal_message(text, text) from public;
grant execute on function public.portal_message(text, text) to anon, authenticated;

-- Heart or un-heart a listing from the portal. Only listings the portal shows (active, same team).
create function public.portal_favorite(p_token text, p_property uuid, p_on boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare l public.portal_links;
begin
  l := private.portal_link(p_token);
  if l.id is null then return 'closed'; end if;
  if not exists (select 1 from public.properties where id = p_property and org_id = l.org_id and status in ('Active', 'Coming soon')) then return 'invalid'; end if;
  if p_on then
    insert into public.favorites (contact_id, property_id, org_id) values (l.contact_id, p_property, l.org_id) on conflict do nothing;
    if found then -- a buying signal: put it on the client's timeline for their agent
      insert into public.activities (org_id, contact_id, user_id, channel, direction, content)
      select l.org_id, l.contact_id, null, 'Note', 'in', 'Saved ' || p.address || ' in the client portal' from public.properties p where p.id = p_property;
    end if;
  else
    delete from public.favorites where contact_id = l.contact_id and property_id = p_property;
  end if;
  return 'ok';
end $$;
revoke execute on function public.portal_favorite(text, uuid, boolean) from public;
grant execute on function public.portal_favorite(text, uuid, boolean) to anon, authenticated;
