-- Light theme, a team-wide default Today layout, and a custom domain for client-facing pages.

-- Theme: the team default (owners/admins) and each person's override (null = follow the team).
alter table public.organizations
  add column theme text not null default 'dark' check (theme in ('dark', 'light', 'system')),
  add column home_order text[] not null default '{}' check (cardinality(home_order) <= 30),
  add column home_hidden text[] not null default '{}' check (cardinality(home_hidden) <= 30),
  -- Custom domain for lead forms, open house sign-in and the client portal. A claim is only live once the server
  -- has seen the team's TXT record on the domain (domain_verified is set with the service key, never by users),
  -- and only verified domains are unique, so nobody can squat a domain they don't control.
  add column custom_domain text check (
    length(custom_domain) <= 253 and custom_domain ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$'
  ),
  add column domain_verified boolean not null default false;
create unique index organizations_verified_domain on public.organizations (custom_domain) where domain_verified;
grant update (theme, home_order, home_hidden, custom_domain) on public.organizations to authenticated;

-- Changing or clearing the domain always drops verification.
create function private.reset_domain_verified() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.custom_domain is distinct from old.custom_domain then new.domain_verified := false; end if;
  return new;
end $$;
create trigger organizations_reset_domain before update of custom_domain on public.organizations
  for each row execute function private.reset_domain_verified();

alter table public.user_prefs add column theme text check (theme in ('dark', 'light', 'system'));

-- App shell: adds the effective theme (person's choice, else the team's) and the team's verified domain.
create or replace function public.app_brand() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('color', o.brand_color, 'radius', o.button_radius, 'logo', o.logo_path, 'off', to_jsonb(o.disabled_features),
    'name', o.name, 'theme', coalesce((select p.theme from public.user_prefs p where p.user_id = auth.uid()), o.theme),
    'domain', case when o.domain_verified then o.custom_domain end)
  from public.organizations o where o.id = (select private.my_org())
$$;

-- Custom-domain gate for the proxy: true only if the page's team owns this verified domain.
create function public.domain_allows(p_host text, p_kind text, p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organizations o
    where o.domain_verified and o.custom_domain = lower(p_host)
      and o.id = case p_kind
        when 'form' then (select f.org_id from public.lead_forms f where f.id = private.as_uuid(p_id))
        when 'oh' then (select h.org_id from public.open_houses h where h.id = private.as_uuid(p_id))
        when 'portal' then (select l.org_id from private.portal_link(p_id) l)
      end
  )
$$;
revoke execute on function public.domain_allows(text, text, text) from public;
grant execute on function public.domain_allows(text, text, text) to anon, authenticated;
