-- Public showing booking (/f/<form>/book): a visitor picks one of the team's listings and an open half hour.
-- Reuses submit_lead (rate limits, dedupe, speed-to-lead task), then adds a requested showing. Keyed like the
-- other public RPCs: only the app server (FORM_RPC_KEY) can call them.

-- Bookable listings and their taken times for the next 14 days. No names or contact details.
create function public.booking_info(p_key text, p_form uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when not private.key_ok('form_rpc', p_key) then null else (
    select jsonb_build_object(
      'team', o.name,
      'listings', coalesce((
        select jsonb_agg(jsonb_build_object('id', p.id, 'address', p.address, 'area', p.area, 'price', p.price, 'beds', p.beds,
          'baths', p.baths, 'rent', p.listing_kind = 'rent',
          'busy', coalesce((select jsonb_agg(jsonb_build_array(s.starts_at, s.ends_at)) from public.showings s
            where s.property_id = p.id and s.status in ('requested', 'confirmed') and s.ends_at > now() and s.starts_at < now() + interval '15 days'), '[]'))
          order by p.created_at desc)
        from public.properties p
        where p.org_id = f.org_id and p.status in ('Active', 'Coming soon') and p.approved_at is not null), '[]'))
    from public.lead_forms f join public.organizations o on o.id = f.org_id
    where f.id = p_form and f.enabled
  ) end
$$;

create function public.book_showing(
  p_key text, p_form uuid, p_ip_hash text, p_name text, p_email text, p_phone text, p_property uuid, p_starts timestamptz,
  p_consent_call_sms boolean, p_consent_email boolean
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  f public.lead_forms; p public.properties; r text; v_contact uuid;
  v_email text := nullif(lower(left(btrim(coalesce(p_email, '')), 320)), '');
  v_phone text := nullif(left(regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g'), 20), '');
begin
  if not private.key_ok('form_rpc', p_key) then return 'forbidden'; end if;
  select * into f from public.lead_forms where id = p_form and enabled;
  if f.id is null then return 'closed'; end if;
  select * into p from public.properties where id = p_property and org_id = f.org_id and status in ('Active', 'Coming soon') and approved_at is not null;
  if p.id is null then return 'invalid'; end if;
  -- On the half hour, at least an hour out, within two weeks.
  if p_starts is null or p_starts < now() + interval '1 hour' or p_starts > now() + interval '14 days'
     or extract(second from p_starts) <> 0 or extract(minute from p_starts)::int % 30 <> 0 then return 'invalid'; end if;
  perform pg_advisory_xact_lock(hashtext(p.id::text)); -- two visitors can't grab the same slot at once
  if exists (select 1 from public.showings s where s.property_id = p.id and s.status in ('requested', 'confirmed')
             and tstzrange(s.starts_at, s.ends_at) && tstzrange(p_starts, p_starts + interval '30 minutes')) then return 'taken'; end if;

  r := private.submit_lead_unkeyed(p_form, p_ip_hash, p_name, p_email, p_phone,
    'Requested a showing of ' || p.address || ' at ' || to_char(p_starts at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC',
    p_consent_call_sms, p_consent_email, 'Showing request');
  if r <> 'ok' then return r; end if;

  select id into v_contact from public.contacts
  where org_id = f.org_id and ((v_email is not null and lower(email) = v_email) or (v_phone is not null and phone = v_phone))
  order by created_at limit 1;
  -- A brand-new lead asking to see a rental is a renter.
  if p.listing_kind = 'rent' then
    update public.contacts set type = 'renter' where id = v_contact and type = 'buyer' and created_at > now() - interval '1 minute';
  end if;
  insert into public.showings (org_id, contact_id, property_id, agent_id, starts_at, ends_at, status, notes)
  values (f.org_id, v_contact, p.id, null, p_starts, p_starts + interval '30 minutes', 'requested', 'Booked online');
  return 'ok';
end $$;

revoke execute on function public.booking_info(text, uuid), public.book_showing(text, uuid, text, text, text, text, uuid, timestamptz, boolean, boolean) from public;
grant execute on function public.booking_info(text, uuid), public.book_showing(text, uuid, text, text, text, text, uuid, timestamptz, boolean, boolean) to anon, authenticated;
