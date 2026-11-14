-- MCP server (/api/mcp): people connect their own AI assistant (Claude, ChatGPT, Cursor...) to Estos.
--
-- Access is the person's own, never more. Every tool runs as the `authenticated` role with that person's claims, so
-- the same RLS policies as the app apply (active team, two-step sign-in, paused sub-accounts).
--   * OAuth: the client holds a normal Supabase access token for the user; PostgREST sets the role and claims.
--   * Personal tokens (estos_…): public.mcp() checks the hash, then sets the claims and switches to `authenticated`
--     for the rest of the transaction. This works because PostgREST's session user (authenticator) may assume
--     `authenticated`; it can't happen inside a security definer function, so mcp() is security invoker and only
--     switches after a valid token.
-- Tools only read and add: no deletes, no sending anything to clients.

create table public.mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  prefix text not null,
  token_hash text not null unique,
  scope text not null check (scope in ('read', 'write')),
  aal text not null check (aal in ('aal1', 'aal2')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index mcp_tokens_user_idx on public.mcp_tokens (user_id);
alter table public.mcp_tokens enable row level security;
create policy "own tokens" on public.mcp_tokens for select to authenticated using (user_id = (select auth.uid()));
create policy "revoke own tokens" on public.mcp_tokens for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.mcp_tokens from anon, authenticated;
grant select (id, name, prefix, scope, created_at, expires_at, last_used_at, revoked_at) on public.mcp_tokens to authenticated;
grant update (revoked_at) on public.mcp_tokens to authenticated;

-- A new token, returned once in plain text; only its hash is kept. It carries the sign-in level it was made at, so
-- someone who turns on two-step sign-in later can't keep using a token made before.
create function public.create_mcp_token(p_name text, p_scope text, p_days int) returns text
language plpgsql security definer set search_path = '' as $$
declare v_token text := 'estos_' || encode(extensions.gen_random_bytes(32), 'hex');
begin
  if auth.uid() is null or private.my_org() is null then raise exception 'Sign in to a team first'; end if;
  if p_scope not in ('read', 'write') then raise exception 'Access must be read or write'; end if;
  if p_days not in (30, 90, 365) then raise exception 'Expiry must be 30, 90 or 365 days'; end if;
  if length(btrim(coalesce(p_name, ''))) not between 1 and 80 then raise exception 'Name the token (up to 80 characters)'; end if;
  if (select count(*) from public.mcp_tokens where user_id = auth.uid() and revoked_at is null and expires_at > now()) >= 10 then
    raise exception 'Up to 10 active tokens; revoke one first';
  end if;
  insert into public.mcp_tokens (user_id, name, prefix, token_hash, scope, aal, expires_at)
  values (auth.uid(), btrim(p_name), left(v_token, 14), encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), p_scope,
          case when coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2' then 'aal2' else 'aal1' end, now() + make_interval(days => p_days));
  return v_token;
end $$;
revoke execute on function public.create_mcp_token(text, text, int) from public, anon;
grant execute on function public.create_mcp_token(text, text, int) to authenticated;

-- Token → owner, scope and sign-in level, or nothing (unknown, revoked, expired, user banned or deleted).
create function private.mcp_token(p_token text) returns table (user_id uuid, scope text, aal text)
language plpgsql security definer set search_path = '' as $$
declare t public.mcp_tokens;
begin
  if p_token is null or p_token !~ '^estos_[0-9a-f]{64}$' then return; end if;
  select k.* into t from public.mcp_tokens k join auth.users u on u.id = k.user_id
  where k.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') and k.revoked_at is null and k.expires_at > now()
    and u.deleted_at is null and (u.banned_until is null or u.banned_until < now());
  if t.id is null then return; end if;
  if t.last_used_at is null or t.last_used_at < now() - interval '1 minute' then
    update public.mcp_tokens set last_used_at = now() where id = t.id;
  end if;
  return query select t.user_id, t.scope, t.aal;
end $$;
revoke execute on function private.mcp_token(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------
-- Tool helpers. Everything below is security invoker: it runs as the user, under RLS.

create function private.mcp_text(a jsonb, k text, max int default 2000) returns text
language sql immutable set search_path = '' as $$ select nullif(left(btrim(a ->> k), max), '') $$;

create function private.mcp_id(a jsonb, k text, required boolean default true) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  if coalesce(a ->> k, '') = '' then
    if required then raise exception 'mcp: % is required', k; end if;
    return null;
  end if;
  if a ->> k !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'mcp: % must be an id from Estos', k; end if;
  return (a ->> k)::uuid;
end $$;

create function private.mcp_list(a jsonb, k text) returns text[]
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(a -> k) = 'array'
    then (select coalesce(array_agg(left(btrim(x), 100)), '{}') from jsonb_array_elements_text(a -> k) x where btrim(x) <> '')
  end
$$;

create function private.mcp_limit(a jsonb, def int, max int) returns int
language sql immutable set search_path = '' as $$ select greatest(1, least(coalesce((a ->> 'limit')::int, def), max)) $$;

create function private.mcp_like(q text) returns text
language sql immutable set search_path = '' as $$ select '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%' $$;

-- The team's time zone and calling window (never wider than the federal 8am–9pm).
create function private.mcp_team() returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('tz', coalesce(o.time_zone, 'America/New_York'),
    'today', (now() at time zone coalesce(o.time_zone, 'America/New_York'))::date,
    'call_start', greatest(8, coalesce(o.call_start, 8)), 'call_end', least(21, coalesce(o.call_end, 21)),
    'hour', extract(hour from now() at time zone coalesce(o.time_zone, 'America/New_York'))::int)
  from public.organizations o where o.id = private.my_org()
$$;

-- A lead as the assistant sees it, with who may be contacted how right now (TCPA: texts need consent; cold calls
-- only to a number checked against the Do Not Call Registry in the last 31 days; calls and texts inside calling hours).
create function private.mcp_lead(c public.contacts, t jsonb) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', c.id, 'name', c.name, 'type', c.type, 'stage', c.stage, 'score', c.score, 'score_reason', nullif(c.score_why, ''),
    'email', nullif(c.email, ''), 'phone', nullif(c.phone, ''), 'budget', nullif(c.budget, ''), 'areas', c.areas,
    'wants', c.preferences, 'tags', c.tags, 'moving_within_months', c.move_by, 'next_action', nullif(c.next_action, ''),
    'intent', nullif(c.intent, ''), 'sources', c.sources,
    'owner', (select m.email from public.memberships m where m.user_id = c.owner_id and m.org_id = c.org_id),
    'created_at', c.created_at, 'last_activity_at', c.last_activity_at, 'first_reply_at', c.first_response_at,
    'contact_rules', jsonb_build_object(
      'do_not_contact', c.dnc,
      'can_call', coalesce(c.phone, '') <> '' and not c.dnc and (c.consent_call or (c.dnc_checked_on > (t ->> 'today')::date - 31 and c.dnc_checked_on <= (t ->> 'today')::date)),
      'can_text', coalesce(c.phone, '') <> '' and not c.dnc and c.consent_sms,
      'can_email', coalesce(c.email, '') <> '' and not c.dnc and c.consent_email,
      'inside_calling_hours', (t ->> 'hour')::int >= (t ->> 'call_start')::int and (t ->> 'hour')::int < (t ->> 'call_end')::int,
      'calling_hours', format('%s:00–%s:00 %s', t ->> 'call_start', t ->> 'call_end', t ->> 'tz'))
  ))
$$;

create function private.mcp_task(k public.tasks) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_strip_nulls(jsonb_build_object('id', k.id, 'title', k.title, 'kind', k.kind, 'due_at', k.due_at, 'done', k.done,
    'note', nullif(k.note, ''), 'lead_id', k.contact_id, 'lead', (select c.name from public.contacts c where c.id = k.contact_id),
    'overdue', not k.done and k.due_at < now(), 'made_by', k.created_by))
$$;

create function private.mcp_listing(p public.properties, detail boolean default false) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_strip_nulls(jsonb_build_object('id', p.id, 'address', p.address, 'area', nullif(p.area, ''), 'city', nullif(p.city, ''),
    'state', nullif(p.state, ''), 'zip', nullif(p.zip, ''), 'price', p.price, 'for', case p.listing_kind when 'rent' then 'rent' else 'sale' end,
    'status', p.status, 'beds', p.beds, 'baths', p.baths, 'sqft', p.sqft, 'home_type', p.home_type, 'mls_id', p.mls_id,
    'features', p.features, 'est_rent', p.est_rent, 'listing_expires', p.listing_expires, 'created_at', p.created_at,
    'description', case when detail then nullif(p.description, '') else nullif(left(p.description, 280), '') end,
    'showing_notes', case when detail then nullif(p.showing_notes, '') end, 'tour_url', case when detail then p.tour_url end))
$$;

create function private.mcp_showing(s public.showings) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_strip_nulls(jsonb_build_object('id', s.id, 'starts_at', s.starts_at, 'ends_at', s.ends_at, 'status', s.status,
    'lead_id', s.contact_id, 'lead', (select c.name from public.contacts c where c.id = s.contact_id),
    'listing_id', s.property_id, 'address', coalesce((select p.address from public.properties p where p.id = s.property_id), nullif(s.address, '')),
    'interest', s.interest, 'rating', s.rating, 'feedback', nullif(s.feedback, ''), 'notes', nullif(s.notes, '')))
$$;

create function private.mcp_deal(d public.deals) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_strip_nulls(jsonb_build_object('id', d.id, 'side', d.side, 'status', d.status, 'price', d.price,
    'address', coalesce((select p.address from public.properties p where p.id = d.property_id), nullif(d.address, '')),
    'listing_id', d.property_id, 'lead_id', d.contact_id, 'client', (select c.name from public.contacts c where c.id = d.contact_id),
    'accepted_on', d.accepted_on, 'close_on', d.close_on, 'commission_pct', d.commission_pct,
    'gross_commission', round(d.price * coalesce(d.commission_pct, 0) / 100 * (1 - coalesce(d.referral_pct, 0) / 100), 2),
    'notes', nullif(d.notes, ''),
    'next_milestone', (select jsonb_build_object('title', m.title, 'due_on', m.due_on) from public.deal_milestones m
      where m.deal_id = d.id and m.done_at is null order by m.due_on nulls last, m.position limit 1)))
$$;

-- ---------------------------------------------------------------------------------------------------------------
-- Read tools

create function private.mcp_whoami(scope text) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('user', (select m.email from public.memberships m where m.user_id = auth.uid() and m.org_id = o.id),
    'role', private.my_role(), 'team', o.name, 'plan', o.plan, 'access', scope, 'time_zone', coalesce(o.time_zone, 'America/New_York'),
    'today', (now() at time zone coalesce(o.time_zone, 'America/New_York'))::date)
  from public.organizations o where o.id = private.my_org()
$$;

create function private.mcp_daily_brief(a jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  t jsonb := private.mcp_team();
  d date := (t ->> 'today')::date;
  tz text := t ->> 'tz';
  mine boolean := coalesce((a ->> 'mine')::boolean, false);
begin
  return jsonb_build_object(
    'today', d, 'time_zone', tz,
    'overdue_tasks', coalesce((select jsonb_agg(private.mcp_task(k) order by k.due_at) from (select * from public.tasks k
      where not k.done and k.due_at < now() and (not mine or k.assignee_id = auth.uid()) order by k.due_at limit 25) k), '[]'),
    'due_today', coalesce((select jsonb_agg(private.mcp_task(k) order by k.due_at) from (select * from public.tasks k
      where not k.done and k.due_at >= now() and (k.due_at at time zone tz)::date = d and (not mine or k.assignee_id = auth.uid())
      order by k.due_at limit 25) k), '[]'),
    'new_leads_waiting_for_first_reply', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'arrived_at', c.created_at,
      'waiting_minutes', floor(extract(epoch from now() - c.created_at) / 60)) order by c.created_at) from (select * from public.contacts c
      where c.inbound and c.first_response_at is null and c.created_at > now() - interval '7 days' and c.is_sample is not true
        and c.stage not in ('Closed', 'Lost') and (not mine or c.owner_id = auth.uid()) order by c.created_at limit 15) c), '[]'),
    'hot_leads_without_a_next_step', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'score', c.score,
      'moving_within_months', c.move_by, 'stage', c.stage, 'next_action', nullif(c.next_action, ''))) from (select * from public.contacts c
      where (c.score >= 80 or c.move_by in ('asap', '1-3')) and c.stage not in ('Closed', 'Lost') and c.is_sample is not true
        and (not mine or c.owner_id = auth.uid())
        and not exists (select 1 from public.tasks k where k.contact_id = c.id and not k.done)
      order by c.score desc limit 10) c), '[]'),
    'showings_next_24h', coalesce((select jsonb_agg(private.mcp_showing(s) order by s.starts_at) from (select * from public.showings s
      where s.starts_at between now() and now() + interval '24 hours' and s.status in ('requested', 'confirmed')
        and (not mine or s.agent_id = auth.uid()) order by s.starts_at limit 20) s), '[]'),
    'deal_deadlines_next_7_days', coalesce((select jsonb_agg(jsonb_build_object('deal_id', x.deal_id, 'milestone', x.title, 'due_on', x.due_on,
      'address', x.address, 'client', x.client) order by x.due_on) from (select m.deal_id, m.title, m.due_on,
        coalesce((select p.address from public.properties p where p.id = dl.property_id), dl.address) address,
        (select c.name from public.contacts c where c.id = dl.contact_id) client
      from public.deal_milestones m join public.deals dl on dl.id = m.deal_id
      where dl.status = 'active' and m.done_at is null and m.due_on <= d + 7 and (not mine or dl.owner_id = auth.uid())
      order by m.due_on limit 20) x), '[]'),
    'deals_closing_next_30_days', coalesce((select jsonb_agg(private.mcp_deal(dl) order by dl.close_on) from (select * from public.deals dl
      where dl.status = 'active' and dl.close_on between d and d + 30 and (not mine or dl.owner_id = auth.uid()) order by dl.close_on limit 20) dl), '[]'),
    'listings_expiring_next_30_days', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'address', p.address, 'expires', p.listing_expires))
      from public.properties p where p.status in ('Active', 'Coming soon') and p.listing_expires between d and d + 30), '[]')
  );
end $$;

create function private.mcp_search(a jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare q text := private.mcp_text(a, 'query', 100); l text; t jsonb := private.mcp_team();
begin
  if q is null then raise exception 'mcp: query is required'; end if;
  l := private.mcp_like(q);
  return jsonb_build_object(
    'leads', coalesce((select jsonb_agg(private.mcp_lead(c, t)) from (select * from public.contacts c
      where c.name ilike l or c.email ilike l or c.phone ilike l or regexp_replace(c.phone, '\D', '', 'g') like private.mcp_like(nullif(regexp_replace(q, '\D', '', 'g'), ''))
        or exists (select 1 from unnest(c.tags) g where g ilike l)
      order by c.last_activity_at desc nulls last limit 10) c), '[]'),
    'listings', coalesce((select jsonb_agg(private.mcp_listing(p)) from (select * from public.properties p
      where p.address ilike l or p.area ilike l or p.city ilike l or p.mls_id ilike l or p.zip ilike l order by p.created_at desc limit 10) p), '[]'),
    'deals', coalesce((select jsonb_agg(private.mcp_deal(dl)) from (select dl.* from public.deals dl left join public.properties p on p.id = dl.property_id
      left join public.contacts c on c.id = dl.contact_id
      where dl.address ilike l or p.address ilike l or c.name ilike l order by dl.created_at desc limit 10) dl), '[]'));
end $$;

create function private.mcp_list_leads(a jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  t jsonb := private.mcp_team();
  v_stage text := private.mcp_text(a, 'stage', 40);
  typ text := lower(private.mcp_text(a, 'type', 40));
  tag text := private.mcp_text(a, 'tag', 100);
  min_score int := (a ->> 'min_score')::int;
  quiet int := (a ->> 'quiet_days')::int;
  soon boolean := coalesce((a ->> 'moving_soon')::boolean, false);
  mine boolean := coalesce((a ->> 'mine')::boolean, false);
  sort text := coalesce(private.mcp_text(a, 'sort', 20), 'score');
begin
  return coalesce((select jsonb_agg(private.mcp_lead(c, t)) from (select * from public.contacts c
    where (v_stage is null or c.stage = v_stage) and (typ is null or c.type = typ) and (tag is null or tag = any (c.tags))
      and (min_score is null or c.score >= min_score) and (quiet is null or coalesce(c.last_activity_at, c.created_at) < now() - make_interval(days => quiet))
      and (not soon or c.move_by in ('asap', '1-3')) and (not mine or c.owner_id = auth.uid()) and c.is_sample is not true
    order by case when sort = 'recent' then extract(epoch from coalesce(c.last_activity_at, c.created_at)) when sort = 'newest' then extract(epoch from c.created_at) else c.score end desc nulls last
    limit private.mcp_limit(a, 25, 100)) c), '[]');
end $$;

create function private.mcp_get_lead(a jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare v_id uuid := private.mcp_id(a, 'lead_id'); c public.contacts;
begin
  select * into c from public.contacts x where x.id = v_id;
  if c.id is null then raise exception 'mcp: lead not found'; end if;
  return private.mcp_lead(c, private.mcp_team()) || jsonb_build_object(
    'timeline', coalesce((select jsonb_agg(jsonb_build_object('at', x.ts, 'channel', x.channel, 'direction', x.direction, 'text', left(x.content, 1000)) order by x.ts desc)
      from (select * from public.activities x where x.contact_id = c.id order by x.ts desc limit 30) x), '[]'),
    'open_tasks', coalesce((select jsonb_agg(private.mcp_task(k) order by k.due_at) from public.tasks k where k.contact_id = c.id and not k.done), '[]'),
    'showings', coalesce((select jsonb_agg(private.mcp_showing(s) order by s.starts_at desc) from (select * from public.showings s where s.contact_id = c.id order by s.starts_at desc limit 20) s), '[]'),
    'deals', coalesce((select jsonb_agg(private.mcp_deal(dl)) from public.deals dl where dl.contact_id = c.id), '[]'),
    'offers', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'amount', o.amount, 'status', o.status, 'financing', o.financing,
      'address', coalesce((select p.address from public.properties p where p.id = o.property_id), o.address), 'expires_at', o.expires_at))
      from public.offers o where o.contact_id = c.id), '[]'));
end $$;

create function private.mcp_list_tasks(a jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare t jsonb := private.mcp_team(); w text := coalesce(private.mcp_text(a, 'when', 20), 'open'); mine boolean := coalesce((a ->> 'mine')::boolean, false);
begin
  if w not in ('overdue', 'today', 'upcoming', 'open', 'done') then raise exception 'mcp: when must be overdue, today, upcoming, open or done'; end if;
  return coalesce((select jsonb_agg(private.mcp_task(k) order by k.due_at) from (select * from public.tasks k
    where (not mine or k.assignee_id = auth.uid())
      and case w when 'done' then k.done
        when 'overdue' then not k.done and k.due_at < now()
        when 'today' then not k.done and (k.due_at at time zone (t ->> 'tz'))::date = (t ->> 'today')::date
        when 'upcoming' then not k.done and k.due_at >= now()
        else not k.done end
    order by case when w = 'done' then -extract(epoch from k.due_at) else extract(epoch from k.due_at) end
    limit private.mcp_limit(a, 50, 200)) k), '[]');
end $$;

create function private.mcp_list_listings(a jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare st text := private.mcp_text(a, 'status', 40); kind text := private.mcp_text(a, 'for', 10); v_area text := private.mcp_text(a, 'area', 100);
  maxp numeric := (a ->> 'max_price')::numeric; minp numeric := (a ->> 'min_price')::numeric; v_beds int := (a ->> 'min_beds')::int;
begin
  return coalesce((select jsonb_agg(private.mcp_listing(p)) from (select * from public.properties p
    where (st is null or p.status = st) and (kind is null or p.listing_kind = kind)
      and (v_area is null or p.area ilike private.mcp_like(v_area) or p.city ilike private.mcp_like(v_area) or p.zip = v_area)
      and (maxp is null or p.price <= maxp) and (minp is null or p.price >= minp) and (v_beds is null or p.beds >= v_beds)
    order by p.created_at desc limit private.mcp_limit(a, 25, 100)) p), '[]');
end $$;

create function private.mcp_get_listing(a jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare v_id uuid := private.mcp_id(a, 'listing_id'); p public.properties;
begin
  select * into p from public.properties x where x.id = v_id;
  if p.id is null then raise exception 'mcp: listing not found'; end if;
  return private.mcp_listing(p, true) || jsonb_build_object(
    'seller', (select jsonb_build_object('id', c.id, 'name', c.name) from public.contacts c where c.id = p.seller_id),
    'showings', coalesce((select jsonb_agg(private.mcp_showing(s) order by s.starts_at desc) from (select * from public.showings s where s.property_id = p.id order by s.starts_at desc limit 30) s), '[]'),
    'offers', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'buyer', coalesce(nullif(o.buyer_name, ''), (select c.name from public.contacts c where c.id = o.contact_id)),
      'amount', o.amount, 'seller_credit', o.seller_credit, 'earnest', o.earnest, 'financing', o.financing, 'down_pct', o.down_pct,
      'contingencies', o.contingencies, 'close_on', o.close_on, 'expires_at', o.expires_at, 'status', o.status) order by o.amount desc)
      from public.offers o where o.property_id = p.id), '[]'));
end $$;

create function private.mcp_list_deals(a jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare st text := coalesce(private.mcp_text(a, 'status', 20), 'active'); mine boolean := coalesce((a ->> 'mine')::boolean, false);
begin
  return coalesce((select jsonb_agg(private.mcp_deal(dl)) from (select * from public.deals dl
    where (st = 'all' or dl.status = st) and (not mine or dl.owner_id = auth.uid())
    order by dl.close_on nulls last limit private.mcp_limit(a, 50, 200)) dl), '[]');
end $$;

create function private.mcp_get_deal(a jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare v_id uuid := private.mcp_id(a, 'deal_id'); dl public.deals;
begin
  select * into dl from public.deals x where x.id = v_id;
  if dl.id is null then raise exception 'mcp: deal not found'; end if;
  return private.mcp_deal(dl) || jsonb_build_object(
    'milestones', coalesce((select jsonb_agg(jsonb_build_object('title', m.title, 'due_on', m.due_on, 'done_at', m.done_at) order by m.position, m.due_on)
      from public.deal_milestones m where m.deal_id = dl.id), '[]'),
    'last_client_contact', (select max(x.ts) from public.activities x where x.contact_id = dl.contact_id));
end $$;

create function private.mcp_list_showings(a jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare f timestamptz := coalesce((a ->> 'from')::timestamptz, now() - interval '1 day'); u timestamptz := coalesce((a ->> 'to')::timestamptz, now() + interval '7 days');
begin
  return coalesce((select jsonb_agg(private.mcp_showing(s) order by s.starts_at) from (select * from public.showings s
    where s.starts_at between f and u order by s.starts_at limit private.mcp_limit(a, 50, 200)) s), '[]');
end $$;

create function private.mcp_pipeline(a jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare d date := (private.mcp_team() ->> 'today')::date;
begin
  return jsonb_build_object(
    'leads_by_stage', coalesce((select jsonb_object_agg(stage, n) from (select c.stage, count(*) n from public.contacts c where c.is_sample is not true group by c.stage) x), '{}'),
    'new_leads_last_30_days', (select count(*) from public.contacts c where c.created_at > now() - interval '30 days' and c.is_sample is not true),
    'active_deals', (select jsonb_build_object('count', count(*), 'volume', coalesce(sum(price), 0),
      'gross_commission', coalesce(round(sum(price * coalesce(commission_pct, 0) / 100 * (1 - coalesce(referral_pct, 0) / 100)), 2), 0)) from public.deals where status = 'active'),
    'closing_this_month', (select count(*) from public.deals where status = 'active' and date_trunc('month', close_on) = date_trunc('month', d)),
    'closed_this_year', (select jsonb_build_object('count', count(*), 'volume', coalesce(sum(price), 0)) from public.deals
      where status = 'closed' and coalesce(closed_at::date, close_on) >= date_trunc('year', d)::date),
    'active_listings', (select count(*) from public.properties where status in ('Active', 'Coming soon')),
    'open_offers', (select count(*) from public.offers where status in ('submitted', 'countered')));
end $$;

-- ---------------------------------------------------------------------------------------------------------------
-- Write tools: add and update only. Same side effects as the app (stage notes on the timeline, showing → stage).

create function private.mcp_create_lead(a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
  nm text := private.mcp_text(a, 'name', 200);
  em text := lower(private.mcp_text(a, 'email', 320));
  ph text := private.mcp_text(a, 'phone', 40);
  typ text := coalesce(lower(private.mcp_text(a, 'type', 20)), 'buyer');
  note text := private.mcp_text(a, 'note', 4000);
  c public.contacts;
begin
  if nm is null then raise exception 'mcp: name is required'; end if;
  if em is not null and em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'mcp: email looks wrong'; end if;
  select * into c from public.contacts x where (em is not null and lower(x.email) = em)
    or (ph is not null and regexp_replace(ph, '\D', '', 'g') <> '' and regexp_replace(x.phone, '\D', '', 'g') = regexp_replace(ph, '\D', '', 'g')) limit 1;
  if c.id is not null then
    return jsonb_build_object('created', false, 'message', 'A lead with this email or phone already exists.', 'lead', private.mcp_lead(c, private.mcp_team()));
  end if;
  -- Consent is never set here: only the person can give it (web form, or the agent ticking it in the app).
  insert into public.contacts (name, email, phone, type, budget, areas, preferences, tags, move_by, sources)
  values (nm, em, ph, typ, coalesce(private.mcp_text(a, 'budget', 100), ''), coalesce(private.mcp_list(a, 'areas'), '{}'),
    coalesce(private.mcp_list(a, 'wants'), '{}'), coalesce(private.mcp_list(a, 'tags'), '{}'), private.mcp_text(a, 'moving_within_months', 10),
    case when private.mcp_text(a, 'source', 40) in ('Zillow', 'Facebook Ads', 'Instagram', 'Website', 'Referral', 'Open House') then array[private.mcp_text(a, 'source', 40)] else '{}' end)
  returning * into c;
  insert into public.activities (contact_id, channel, content) values (c.id, 'Note', 'Added by AI assistant' || coalesce(': ' || note, ''));
  return jsonb_build_object('created', true, 'lead', private.mcp_lead(c, private.mcp_team()));
end $$;

create function private.mcp_update_lead(a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare v_id uuid := private.mcp_id(a, 'lead_id'); c public.contacts; old_stage text; st text := private.mcp_text(a, 'stage', 40);
begin
  select x.stage into old_stage from public.contacts x where x.id = v_id;
  if not found then raise exception 'mcp: lead not found'; end if;
  update public.contacts x set
    stage = coalesce(st, x.stage),
    type = coalesce(lower(private.mcp_text(a, 'type', 20)), x.type),
    next_action = coalesce(private.mcp_text(a, 'next_action', 1000), x.next_action),
    budget = coalesce(private.mcp_text(a, 'budget', 100), x.budget),
    areas = coalesce(private.mcp_list(a, 'areas'), x.areas),
    preferences = coalesce(private.mcp_list(a, 'wants'), x.preferences),
    tags = coalesce(private.mcp_list(a, 'tags'), x.tags),
    move_by = coalesce(private.mcp_text(a, 'moving_within_months', 10), x.move_by)
  where x.id = v_id returning * into c;
  if st is not null and st is distinct from old_stage then
    insert into public.activities (contact_id, channel, content) values (v_id, 'Note', 'Stage → ' || st);
  end if;
  return private.mcp_lead(c, private.mcp_team());
end $$;

create function private.mcp_log_activity(a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare v_id uuid := private.mcp_id(a, 'lead_id'); txt text := private.mcp_text(a, 'text', 4000);
  ch text := coalesce(private.mcp_text(a, 'channel', 20), 'Note'); dir text := coalesce(private.mcp_text(a, 'direction', 3), 'out'); r public.activities;
begin
  if txt is null then raise exception 'mcp: text is required'; end if;
  if not exists (select 1 from public.contacts x where x.id = v_id) then raise exception 'mcp: lead not found'; end if;
  insert into public.activities (contact_id, channel, direction, content) values (v_id, ch, dir, txt) returning * into r;
  return jsonb_build_object('logged', true, 'id', r.id, 'at', r.ts);
end $$;

create function private.mcp_create_task(a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare lead uuid := private.mcp_id(a, 'lead_id', false); due timestamptz; k public.tasks;
begin
  if private.mcp_text(a, 'title', 300) is null then raise exception 'mcp: title is required'; end if;
  if coalesce(a ->> 'due_at', '') !~ '(Z|[+-]\d\d:?\d\d)$' then raise exception 'mcp: due_at must be ISO 8601 with a time zone offset, e.g. 2026-11-16T10:00:00-06:00'; end if;
  due := (a ->> 'due_at')::timestamptz;
  if lead is not null and not exists (select 1 from public.contacts x where x.id = lead) then raise exception 'mcp: lead not found'; end if;
  insert into public.tasks (title, kind, note, contact_id, due_at, created_by)
  values (private.mcp_text(a, 'title', 300), coalesce(private.mcp_text(a, 'kind', 20), 'call'), coalesce(private.mcp_text(a, 'note', 2000), ''), lead, due, 'ai')
  returning * into k;
  return private.mcp_task(k);
end $$;

create function private.mcp_complete_task(a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare v_id uuid := private.mcp_id(a, 'task_id'); k public.tasks;
begin
  update public.tasks x set done = coalesce((a ->> 'done')::boolean, true) where x.id = v_id returning * into k;
  if k.id is null then raise exception 'mcp: task not found'; end if;
  return private.mcp_task(k);
end $$;

create function private.mcp_schedule_showing(a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare lead uuid := private.mcp_id(a, 'lead_id'); prop uuid := private.mcp_id(a, 'listing_id', false); addr text := private.mcp_text(a, 'address', 300);
  mins int := coalesce((a ->> 'minutes')::int, 30); st timestamptz; s public.showings;
begin
  if coalesce(a ->> 'starts_at', '') !~ '(Z|[+-]\d\d:?\d\d)$' then raise exception 'mcp: starts_at must be ISO 8601 with a time zone offset'; end if;
  st := (a ->> 'starts_at')::timestamptz;
  if mins not between 10 and 240 then raise exception 'mcp: minutes must be 10 to 240'; end if;
  if prop is null and addr is null then raise exception 'mcp: give listing_id or address'; end if;
  if not exists (select 1 from public.contacts x where x.id = lead) then raise exception 'mcp: lead not found'; end if;
  if prop is not null and not exists (select 1 from public.properties x where x.id = prop) then raise exception 'mcp: listing not found'; end if;
  insert into public.showings (contact_id, property_id, address, starts_at, ends_at, notes)
  values (lead, prop, case when prop is null then addr else '' end, st, st + make_interval(mins => mins), coalesce(private.mcp_text(a, 'notes', 2000), ''))
  returning * into s;
  update public.contacts x set stage = 'Showing' where x.id = lead and x.stage in ('New', 'Contacted', 'Qualified');
  return private.mcp_showing(s);
end $$;

create function private.mcp_showing_feedback(a jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare v_id uuid := private.mcp_id(a, 'showing_id'); i text := private.mcp_text(a, 'interest', 20); fb text := coalesce(private.mcp_text(a, 'feedback', 2000), '');
  r int := (a ->> 'rating')::int; s public.showings;
begin
  if i not in ('not_interested', 'maybe', 'interested', 'offer') then raise exception 'mcp: interest must be not_interested, maybe, interested or offer'; end if;
  update public.showings x set status = 'done', interest = i, feedback = fb, rating = case when r between 1 and 5 then r end
  where x.id = v_id returning * into s;
  if s.id is null then raise exception 'mcp: showing not found'; end if;
  insert into public.activities (contact_id, channel, direction, content) values (s.contact_id, 'Note', 'in',
    format('Saw %s: %s%s', coalesce((select p.address from public.properties p where p.id = s.property_id), s.address),
      case i when 'not_interested' then 'not interested' when 'maybe' then 'on the fence' when 'interested' then 'interested' else 'wants to make an offer' end,
      case when fb <> '' then format('. "%s"', fb) else '' end));
  return private.mcp_showing(s);
end $$;

-- ---------------------------------------------------------------------------------------------------------------
-- The one entry point. Personal token → become that user; no token → the caller's own JWT (OAuth) must be a user.

create function public.mcp(p_token text, p_tool text, p_args jsonb default '{}') returns jsonb
language plpgsql set search_path = '' as $$
declare tok record; scope text := 'write'; a jsonb := coalesce(p_args, '{}');
begin
  if p_token is not null then
    select * into tok from public.mcp_check(p_token);
    if tok.user_id is null then raise exception 'mcp: unknown, expired or revoked token' using errcode = '28000'; end if;
    perform set_config('request.jwt.claims', jsonb_build_object('sub', tok.user_id, 'role', 'authenticated', 'aud', 'authenticated', 'aal', tok.aal)::text, true);
    perform set_config('request.jwt.claim.sub', tok.user_id::text, true);
    set local role authenticated;
    scope := tok.scope;
  elsif auth.uid() is null then
    raise exception 'mcp: sign in first' using errcode = '28000';
  end if;
  if private.my_org() is null then
    raise exception 'mcp: no team access. Finish two-step sign-in in the app, or ask your team owner' using errcode = '42501';
  end if;
  if scope = 'read' and p_tool in ('create_lead', 'update_lead', 'log_activity', 'create_task', 'complete_task', 'schedule_showing', 'record_showing_feedback') then
    raise exception 'mcp: this token is read-only' using errcode = '42501';
  end if;
  return case p_tool
    when 'whoami' then private.mcp_whoami(scope)
    when 'daily_brief' then private.mcp_daily_brief(a)
    when 'search' then private.mcp_search(a)
    when 'list_leads' then private.mcp_list_leads(a)
    when 'get_lead' then private.mcp_get_lead(a)
    when 'list_tasks' then private.mcp_list_tasks(a)
    when 'list_listings' then private.mcp_list_listings(a)
    when 'get_listing' then private.mcp_get_listing(a)
    when 'list_deals' then private.mcp_list_deals(a)
    when 'get_deal' then private.mcp_get_deal(a)
    when 'list_showings' then private.mcp_list_showings(a)
    when 'pipeline_summary' then private.mcp_pipeline(a)
    when 'create_lead' then private.mcp_create_lead(a)
    when 'update_lead' then private.mcp_update_lead(a)
    when 'log_activity' then private.mcp_log_activity(a)
    when 'create_task' then private.mcp_create_task(a)
    when 'complete_task' then private.mcp_complete_task(a)
    when 'schedule_showing' then private.mcp_schedule_showing(a)
    when 'record_showing_feedback' then private.mcp_showing_feedback(a)
    else null end;
end $$;

-- anon can't reach the private schema, so the token check it needs is a thin public wrapper. It reveals nothing a
-- token's holder doesn't already know.
create function public.mcp_check(p_token text) returns table (user_id uuid, scope text, aal text)
language sql security definer set search_path = '' as $$ select * from private.mcp_token(p_token) $$;

revoke execute on function public.mcp(text, text, jsonb), public.mcp_check(text) from public;
grant execute on function public.mcp(text, text, jsonb), public.mcp_check(text) to anon, authenticated;
do $$ declare f regprocedure; begin
  for f in select p.oid::regprocedure from pg_proc p where p.pronamespace = 'private'::regnamespace and p.proname like 'mcp\_%' and p.proname <> 'mcp_token' loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
