-- Rentals and the Zillow Rental Network feed (HotPads XML 2.1). Rentals use `price` as monthly rent.
-- The feed lives at /feeds/zillow/<token>; only the token's SHA-256 is stored. The app server calls the keyed
-- functions below (FORM_RPC_KEY), so nobody can read a feed without both the server key and the token.

alter table properties
  add column listing_kind text not null default 'sale' check (listing_kind in ('sale', 'rent')),
  add column street text check (length(street) <= 200),
  add column unit text check (length(unit) <= 20),
  add column city text check (length(city) <= 100),
  add column state text check (state ~ '^[A-Z]{2}$'),
  add column zip text check (zip ~ '^\d{5}(-\d{4})?$'),
  add column home_type text check (home_type in ('HOUSE', 'CONDO', 'TOWNHOUSE')),
  add column lease_months smallint check (lease_months between 0 and 60), -- 0 = month to month
  add column available_on date,
  add column furnished boolean not null default false,
  add column cats_ok boolean,
  add column dogs_ok boolean,
  add column parking text check (parking in ('garageAttached', 'garageLot', 'coveredLot', 'street', 'surfaceLot', 'other', 'none')),
  -- Itemized fees (MITS-style), built and validated by the server action; the feed copies them as-is.
  add column fees jsonb not null default '[]' check (jsonb_typeof(fees) = 'array' and jsonb_array_length(fees) <= 20),
  add column updated_at timestamptz not null default now();

create table rental_feeds (
  org_id uuid primary key references organizations on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  contact_name text not null default '' check (length(contact_name) <= 100),
  contact_email text not null check (contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(contact_email) <= 320),
  contact_phone text not null check (contact_phone ~ '^[0-9]{10}$'),
  created_at timestamptz not null default now(),
  last_fetched_at timestamptz
);
alter table rental_feeds enable row level security;
create policy "admins" on rental_feeds for all
  using (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'))
  with check (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'));

-- What the feed publishes: active, broker-approved rentals with a full address.
create function private.feed_listings(p_org uuid) returns setof public.properties
language sql stable security definer set search_path = '' as $$
  select * from public.properties p
  where p.org_id = p_org and p.listing_kind = 'rent' and p.status = 'Active' and p.approved_at is not null
    and p.street is not null and p.city is not null and p.state is not null and p.zip is not null and p.home_type is not null
$$;

create function private.feed_org(p_key text, p_token text) returns uuid
language sql stable security definer set search_path = '' as $$
  select f.org_id from public.rental_feeds f
  where private.key_ok('form_rpc', p_key) and f.token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
$$;

create function public.rental_feed(p_key text, p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_org uuid := private.feed_org(p_key, p_token); out jsonb;
begin
  if v_org is null then return null; end if;
  update public.rental_feeds set last_fetched_at = now() where org_id = v_org;
  select jsonb_build_object(
    'org', replace(v_org::text, '-', ''), 'company', o.name,
    'contact', jsonb_build_object('name', f.contact_name, 'email', f.contact_email, 'phone', f.contact_phone),
    'listings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', replace(p.id::text, '-', ''), 'street', p.street, 'unit', p.unit, 'city', p.city, 'state', p.state, 'zip', p.zip,
        'home_type', p.home_type, 'price', p.price, 'beds', p.beds, 'baths', p.baths, 'sqft', p.sqft, 'description', p.description,
        'lease_months', p.lease_months, 'available_on', p.available_on, 'furnished', p.furnished, 'cats_ok', p.cats_ok,
        'dogs_ok', p.dogs_ok, 'parking', p.parking, 'fees', p.fees, 'tour_url', p.tour_url, 'updated_at', p.updated_at,
        'photos', coalesce((select jsonb_agg(m.id order by m.position) from public.property_media m where m.property_id = p.id), '[]')
      ) order by p.created_at) from private.feed_listings(v_org) p), '[]'))
  into out
  from public.organizations o join public.rental_feeds f on f.org_id = o.id where o.id = v_org;
  return out;
end $$;

-- A photo's storage path, only if it belongs to a listing that's in this feed.
create function public.rental_feed_photo(p_key text, p_token text, p_media uuid) returns text
language sql stable security definer set search_path = '' as $$
  select m.path from public.property_media m
  join private.feed_listings(private.feed_org(p_key, p_token)) p on p.id = m.property_id
  where m.id = p_media
$$;

revoke execute on function public.rental_feed(text, text), public.rental_feed_photo(text, text, uuid) from public;
grant execute on function public.rental_feed(text, text), public.rental_feed_photo(text, text, uuid) to anon, authenticated;
revoke execute on function private.feed_listings(uuid), private.feed_org(text, text) from public;

-- The photo route downloads as anon, so storage needs one narrow read rule: photos of listings in a live feed
-- (already public on Zillow). The check sits in its own schema; anon gets no access to `private`.
create schema feed;
grant usage on schema feed to anon;
create function feed.photo_ok(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.property_media m
    join public.rental_feeds f on f.org_id = m.org_id
    join private.feed_listings(m.org_id) p on p.id = m.property_id
    where m.path = p_path
  )
$$;
revoke execute on function feed.photo_ok(text) from public;
grant execute on function feed.photo_ok(text) to anon;
create policy "rental feed photos" on storage.objects for select to anon
  using (bucket_id = 'listing-photos' and feed.photo_ok(name));
