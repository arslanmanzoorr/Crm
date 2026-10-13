-- White-label: a team's accent color and the option to drop "Powered by EstateOS" on client-facing pages
-- (lead forms, open house sign-in, client portal, showing booking). public_brand returns only those two
-- values for a form id, open house id or live portal token; nothing else about the team.
alter table public.organizations
  add column brand_color text check (brand_color ~ '^#[0-9a-f]{6}$'),
  add column hide_powered_by boolean not null default false;

create function private.as_uuid(p text) returns uuid language sql immutable set search_path = '' as $$
  select case when p ~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$' then p::uuid end
$$;

create function public.public_brand(p_kind text, p_id text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('color', o.brand_color, 'hide', o.hide_powered_by)
  from public.organizations o
  where o.id = case p_kind
    when 'form' then (select f.org_id from public.lead_forms f where f.id = private.as_uuid(p_id))
    when 'oh' then (select h.org_id from public.open_houses h where h.id = private.as_uuid(p_id))
    when 'portal' then (select l.org_id from private.portal_link(p_id) l)
  end
$$;
revoke execute on function public.public_brand(text, text) from public;
grant execute on function public.public_brand(text, text) to anon, authenticated;
