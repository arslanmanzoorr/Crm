-- Response-time numbers now cover inbound leads only (forms, open house, booking, portal, API). Contacts an agent
-- imported or typed in were never "waiting", so they no longer count as "never contacted" or drag the median.
-- Same function as before otherwise; adds response.inbound (the denominator for the % reached figures).
create or replace function public.team_analytics(p_days integer default 90)
returns jsonb language sql stable set search_path to '' as $function$
  with
  win as (select now() - make_interval(days => least(greatest(p_days, 7), 730)) as since),
  agent_take as (
    select d.*, d.price * d.commission_pct / 100 as gci,
           d.price * d.commission_pct / 100 * (1 - d.referral_pct / 100) * d.agent_split_pct / 100 as agent
    from public.deals d
  ),
  leads as (
    select c.*, coalesce(c.sources[1], 'Unknown') as source,
           case when c.inbound then extract(epoch from (c.first_response_at - c.created_at)) / 60 end as response_min,
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
               round((percentile_cont(0.5) within group (order by response_min))::numeric, 1) as median_response_min, (select coalesce(sum(e.amount), 0) from public.expenses e, win w2 where e.source = leads.source and e.spent_on >= w2.since::date) as spend
        from leads group by source) s), '[]'),
    'response', (select jsonb_build_object(
        'inbound', count(*) filter (where inbound),
        'median_min', round((percentile_cont(0.5) within group (order by response_min))::numeric, 1),
        'within_5m', count(*) filter (where response_min <= 5),
        'within_1h', count(*) filter (where response_min <= 60),
        'responded', count(*) filter (where response_min is not null),
        'never', count(*) filter (where inbound and response_min is null)) from leads),
    'cycle', (select jsonb_build_object(
        'lead_to_contract_days', round((percentile_cont(0.5) within group (order by greatest(d.accepted_on - c.created_at::date, 0)))::numeric),
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
        select m.user_id, m.email, m.role, m.office_id,
               (select count(*) from leads l where l.owner_id = m.user_id) as leads,
               (select count(*) from leads l where l.owner_id = m.user_id and l.first_response_at is not null) as reached,
               (select count(*) from leads l where l.owner_id = m.user_id and l.stage in ('Qualified', 'Showing', 'Offer', 'Under Contract', 'Closed')) as qualified,
               (select count(*) from leads l where l.owner_id = m.user_id and l.contracted) as contracted,
               (select round((percentile_cont(0.5) within group (order by l.response_min))::numeric, 1) from leads l where l.owner_id = m.user_id) as median_response_min,
               (select count(*) from public.activities a, win where a.user_id = m.user_id and a.direction = 'out' and a.ts >= win.since) as touches,
               (select count(*) from public.deals d where d.owner_id = m.user_id and d.status = 'active') as active_deals,
               (select count(*) from public.deals d, win where d.owner_id = m.user_id and d.status = 'closed' and d.closed_at >= win.since) as closed,
               (select coalesce(round(sum(t.agent), 2), 0) from agent_take t, win where t.owner_id = m.user_id and t.status = 'closed' and t.closed_at >= win.since) as closed_agent
        from public.memberships m where m.org_id = (select private.my_org())) a), '[]'),
    'cohorts', coalesce((select jsonb_agg(k order by k.month) from (
        select to_char(date_trunc('month', c.created_at), 'YYYY-MM') as month, count(*) as leads,
               count(*) filter (where c.first_response_at is not null) as reached,
               count(*) filter (where c.stage in ('Qualified', 'Showing', 'Offer', 'Under Contract', 'Closed')) as qualified,
               count(*) filter (where exists (select 1 from public.deals d where d.contact_id = c.id and d.status in ('active', 'closed')))  as contracted,
               count(*) filter (where exists (select 1 from public.deals d where d.contact_id = c.id and d.status = 'closed')) as closed
        from public.contacts c where c.created_at >= date_trunc('month', now()) - interval '11 months'
        group by 1) k), '[]'),
    'listings', coalesce((select jsonb_agg(l order by l.days_on_market desc) from (
        select p.id, p.address, p.status, p.price, (now()::date - p.created_at::date) as days_on_market,
               (select count(*) from public.open_house_visits v join public.open_houses o on o.id = v.open_house_id where o.property_id = p.id) as visitors,
               (select count(*) from public.showings s where s.property_id = p.id and s.status in ('confirmed', 'done')) as showings,
               (select count(*) from public.offers o where o.property_id = p.id and o.side = 'seller') as offers,
               (select max(o.amount) from public.offers o where o.property_id = p.id and o.side = 'seller' and o.status not in ('rejected', 'withdrawn')) as best_offer
        from public.properties p where p.status <> 'Sold') l), '[]')
  )
$function$;
