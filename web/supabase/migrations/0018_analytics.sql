-- Team analytics in one round trip. SECURITY INVOKER: it reads through the caller's RLS, so it only ever sees
-- the caller's active team. Aggregates in Postgres so the app never pulls every row.

create index if not exists deals_org_closed on deals (org_id, closed_at) where status = 'closed';
create index if not exists contacts_org_created on contacts (org_id, created_at);
create index if not exists activities_org_user_ts on activities (org_id, user_id, ts);

create function public.team_analytics(p_days int default 90)
returns jsonb
language sql stable security invoker set search_path = '' as $$
  with
  win as (select now() - make_interval(days => least(greatest(p_days, 7), 730)) as since),
  agent_take as (
    select d.*, d.price * d.commission_pct / 100 as gci,
           d.price * d.commission_pct / 100 * (1 - d.referral_pct / 100) * d.agent_split_pct / 100 as agent
    from public.deals d
  ),
  leads as (
    select c.*, coalesce(c.sources[1], 'Unknown') as source,
           extract(epoch from (c.first_response_at - c.created_at)) / 60 as response_min,
           exists (select 1 from public.deals d where d.contact_id = c.id and d.status in ('active', 'closed')) as contracted,
           exists (select 1 from public.deals d where d.contact_id = c.id and d.status = 'closed') as closed
    from public.contacts c, win where c.created_at >= win.since
  )
  select jsonb_build_object(
    'days', least(greatest(p_days, 7), 730),
    'leads', (select count(*) from leads),
    'by_source', coalesce((select jsonb_agg(s order by s.leads desc) from (
        select source, count(*) as leads,
               count(*) filter (where first_response_at is not null) as reached,
               count(*) filter (where stage in ('Qualified', 'Showing', 'Offer', 'Under Contract', 'Closed')) as qualified,
               count(*) filter (where contracted) as contracted,
               count(*) filter (where closed) as closed,
               round((percentile_cont(0.5) within group (order by response_min))::numeric, 1) as median_response_min
        from leads group by source) s), '[]'),
    'response', (select jsonb_build_object(
        'median_min', round((percentile_cont(0.5) within group (order by response_min))::numeric, 1),
        'within_5m', count(*) filter (where response_min <= 5),
        'within_1h', count(*) filter (where response_min <= 60),
        'responded', count(*) filter (where response_min is not null),
        'never', count(*) filter (where response_min is null)) from leads),
    'cycle', (select jsonb_build_object(
        'lead_to_contract_days', round((percentile_cont(0.5) within group (order by greatest(d.accepted_on - c.created_at::date, 0)))::numeric), -- leads entered after their contract (imports) count as 0, never negative
        'contract_to_close_days', round((percentile_cont(0.5) within group (order by d.closed_at::date - d.accepted_on)
                                    filter (where d.status = 'closed'))::numeric),
        'deals', count(*))
      from public.deals d join public.contacts c on c.id = d.contact_id, win where d.created_at >= win.since),
    'revenue', coalesce((select jsonb_agg(r order by r.month) from (
        select to_char(date_trunc('month', closed_at), 'YYYY-MM') as month, count(*) as deals,
               round(sum(gci), 2) as gci, round(sum(agent), 2) as agent
        from agent_take where status = 'closed' and closed_at >= date_trunc('month', now()) - interval '11 months'
        group by 1) r), '[]'),
    'forecast', coalesce((select jsonb_agg(f order by f.month) from (
        select coalesce(to_char(close_on, 'YYYY-MM'), 'no date') as month, count(*) as deals,
               round(sum(gci), 2) as gci, round(sum(agent), 2) as agent
        from agent_take where status = 'active' group by 1) f), '[]'),
    'agents', coalesce((select jsonb_agg(a order by a.closed_agent desc, a.leads desc) from (
        select m.user_id, m.email, m.role,
               (select count(*) from leads l where l.owner_id = m.user_id) as leads,
               (select round((percentile_cont(0.5) within group (order by l.response_min))::numeric, 1) from leads l where l.owner_id = m.user_id) as median_response_min,
               (select count(*) from public.activities a, win where a.user_id = m.user_id and a.direction = 'out' and a.ts >= win.since) as touches,
               (select count(*) from public.deals d where d.owner_id = m.user_id and d.status = 'active') as active_deals,
               (select count(*) from public.deals d, win where d.owner_id = m.user_id and d.status = 'closed' and d.closed_at >= win.since) as closed,
               (select coalesce(round(sum(t.agent), 2), 0) from agent_take t, win where t.owner_id = m.user_id and t.status = 'closed' and t.closed_at >= win.since) as closed_agent
        from public.memberships m where m.org_id = (select private.my_org())) a), '[]'),
    'listings', coalesce((select jsonb_agg(l order by l.days_on_market desc) from (
        select p.id, p.address, p.status, p.price, (now()::date - p.created_at::date) as days_on_market,
               (select count(*) from public.open_house_visits v join public.open_houses o on o.id = v.open_house_id where o.property_id = p.id) as visitors,
               (select count(*) from public.offers o where o.property_id = p.id and o.side = 'seller') as offers,
               (select max(o.amount) from public.offers o where o.property_id = p.id and o.side = 'seller' and o.status not in ('rejected', 'withdrawn')) as best_offer
        from public.properties p where p.status <> 'Sold') l), '[]')
  )
$$;
revoke execute on function public.team_analytics(int) from public, anon;
grant execute on function public.team_analytics(int) to authenticated;
