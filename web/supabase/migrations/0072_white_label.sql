-- Full white-label for the CRM itself: logo, button shape and switched-off modules per team (owners/admins),
-- plus each person's own Today layout. The accent color (brand_color, 0062) now also themes the app.

alter table public.organizations
  add column logo_path text check (logo_path ~ '^[0-9a-f-]{36}/logo-[0-9a-f]{8}\.(png|jpg|webp)$' and split_part(logo_path, '/', 1) = id::text),
  add column button_radius text not null default 'pill' check (button_radius in ('pill', 'rounded', 'square')),
  add column disabled_features text[] not null default '{}' check (
    cardinality(disabled_features) <= 20
    and disabled_features <@ array['listings','showings','deals','inbox','clients','analytics','tools','automations','farm','marketing','partners']
  );
grant update (logo_path, button_radius, disabled_features) on public.organizations to authenticated;

-- Logos are shown on public pages too, so the bucket is public-read. Small raster images only: no SVG (script risk).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-logos', 'brand-logos', true, 512 * 1024, array['image/png', 'image/jpeg', 'image/webp']);

-- Only owners/admins of the active team write inside that team's folder.
create function private.can_brand(path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select split_part(path, '/', 1) = (select private.my_org())::text and (select private.my_role()) in ('owner', 'admin')
$$;
grant execute on function private.can_brand(text) to authenticated;

create policy "admins upload logo" on storage.objects for insert to authenticated
  with check (bucket_id = 'brand-logos' and private.can_brand(name));
create policy "admins delete logo" on storage.objects for delete to authenticated
  using (bucket_id = 'brand-logos' and private.can_brand(name));

-- Everything the app shell needs in one call: theme and switched-off modules for the active team (null signed out).
create function public.app_brand() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('color', o.brand_color, 'radius', o.button_radius, 'logo', o.logo_path, 'off', to_jsonb(o.disabled_features), 'name', o.name)
  from public.organizations o where o.id = (select private.my_org())
$$;
revoke execute on function public.app_brand() from public, anon;
grant execute on function public.app_brand() to authenticated;

-- Each person's Today page: section order and hidden sections. Keys are checked by the app; size is capped here.
create table public.user_prefs (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  home_order text[] not null default '{}' check (cardinality(home_order) <= 30),
  home_hidden text[] not null default '{}' check (cardinality(home_hidden) <= 30),
  updated_at timestamptz not null default now()
);
alter table public.user_prefs enable row level security;
create policy "own prefs" on public.user_prefs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.user_prefs from anon;
