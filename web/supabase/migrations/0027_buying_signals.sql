-- Buying signals: recent behavior that says a lead is warming up, with the reason. Security invoker, so it
-- reads through the caller's RLS (their active team only).

create function public.buying_signals(p_contact uuid default null)
returns table (contact_id uuid, name text, owner_id uuid, signal text, strength int, at timestamptz)
language sql stable security invoker set search_path = '' as $$
  with c as (select id, name, owner_id from public.contacts where (p_contact is null or id = p_contact) and stage not in ('Closed', 'Lost'))
  -- Back in touch after going quiet: an inbound message in the last 3 days, none in the 21 days before it.
  select c.id as contact_id, c.name, c.owner_id, 'Back in touch after ' || (extract(day from a.ts - prev.ts))::int || ' quiet days' as signal, 3 as strength, a.ts as at
  from c
  join lateral (select ts from public.activities where contact_id = c.id and direction = 'in' and ts > now() - interval '3 days' order by ts desc limit 1) a on true
  join lateral (select ts from public.activities where contact_id = c.id and ts < a.ts order by ts desc limit 1) prev on true
  where a.ts - prev.ts > interval '21 days'
  union all
  -- Saving homes in their portal.
  select c.id, c.name, c.owner_id, 'Saved ' || count(*) || ' home' || case when count(*) > 1 then 's' else '' end || ' in their portal this week', 2, max(f.created_at)
  from c join public.favorites f on f.contact_id = c.id
  where f.created_at > now() - interval '7 days'
  group by c.id, c.name, c.owner_id
  union all
  -- Liked a home at a showing and there's no offer since.
  select c.id, c.name, c.owner_id,
         case s.interest when 'offer' then 'Wants to make an offer on ' else 'Liked ' end || coalesce(p.address, s.address), case s.interest when 'offer' then 4 else 2 end, s.starts_at
  from c join public.showings s on s.contact_id = c.id left join public.properties p on p.id = s.property_id
  where s.interest in ('offer', 'interested') and s.starts_at > now() - interval '7 days'
    and not exists (select 1 from public.offers o where o.contact_id = c.id and o.created_at > s.starts_at)
  union all
  -- Touring: two or more open houses in 30 days.
  select c.id, c.name, c.owner_id, 'Visited ' || count(*) || ' open houses this month', 2, max(v.ts)
  from c join public.open_house_visits v on v.contact_id = c.id
  where v.ts > now() - interval '30 days'
  group by c.id, c.name, c.owner_id having count(*) >= 2
  union all
  -- Just preapproved.
  select c.id, c.name, c.owner_id, 'Preapproved recently', 3, f.updated_at
  from c join public.financing f on f.contact_id = c.id
  where f.stage = 'preapproved' and f.updated_at > now() - interval '7 days'
  order by strength desc, at desc
  limit 200
$$;
revoke execute on function public.buying_signals(uuid) from public, anon;
grant execute on function public.buying_signals(uuid) to authenticated;
