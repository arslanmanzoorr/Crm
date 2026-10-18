-- First-run walkthrough: each person's tour progress, an owner switch to turn the tour off for the team, and a
-- clearly labelled practice lead that stays out of every number and is cleared after 14 days.

alter table public.user_prefs add column tour jsonb not null default '{}'
  check (jsonb_typeof(tour) = 'object' and octet_length(tour::text) <= 500);

-- "tour" joins the modules an owner can switch off.
alter table public.organizations drop constraint organizations_disabled_features_check;
alter table public.organizations add constraint organizations_disabled_features_check check (
  cardinality(disabled_features) <= 20
  and disabled_features <@ array['listings','showings','deals','inbox','clients','analytics','tools','automations','farm','marketing','partners','tour']
);

alter table public.contacts add column is_sample boolean not null default false;

-- Practice leads never count in analytics (new leads, sources, response time, agent numbers, cohorts).
do $$
declare d text := pg_get_functiondef('public.team_analytics(integer)'::regprocedure);
begin
  d := replace(d, 'from public.contacts c, win where c.created_at >= win.since', 'from public.contacts c, win where c.created_at >= win.since and not c.is_sample');
  d := replace(d, 'from public.contacts c where c.created_at >= date_trunc(''month'', now()) - interval ''11 months''',
                  'from public.contacts c where c.created_at >= date_trunc(''month'', now()) - interval ''11 months'' and not c.is_sample');
  execute d;
end $$;

-- App shell: also return this person's tour progress and role, so the walkthrough needs no extra round trip.
create or replace function public.app_brand() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('color', o.brand_color, 'radius', o.button_radius, 'logo', o.logo_path, 'off', to_jsonb(o.disabled_features),
    'name', o.name, 'theme', coalesce((select p.theme from public.user_prefs p where p.user_id = auth.uid()), o.theme),
    'domain', case when o.domain_verified then o.custom_domain end,
    'tour', coalesce((select p.tour from public.user_prefs p where p.user_id = auth.uid()), '{}'::jsonb),
    'role', (select private.my_role()))
  from public.organizations o where o.id = (select private.my_org())
$$;
