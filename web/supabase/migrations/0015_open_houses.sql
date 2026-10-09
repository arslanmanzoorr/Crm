-- Open houses: scheduled per listing, public sign-in (QR or a tablet at the door), visitor feedback for the seller.

-- Tasks may only be assigned to someone on the same team (before: any user id passed the FK).
alter table tasks add constraint tasks_assignee_same_org
  foreign key (org_id, assignee_id) references memberships (org_id, user_id) on delete set null (assignee_id);

create table open_houses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default private.my_org() references organizations on delete cascade,
  property_id uuid not null,
  host_id uuid default auth.uid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (property_id, org_id) references properties (id, org_id) on delete cascade,
  foreign key (org_id, host_id) references memberships (org_id, user_id) on delete set null (host_id),
  unique (id, org_id),
  check (ends_at > starts_at and ends_at - starts_at <= interval '12 hours')
);
create index on open_houses (org_id, starts_at desc);
create index on open_houses (property_id);
alter table open_houses enable row level security;
create policy "active org" on open_houses for all
  using (org_id = (select private.my_org())) with check (org_id = (select private.my_org()));

create table open_house_visits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  open_house_id uuid not null,
  contact_id uuid not null,
  has_agent boolean not null,
  rating int check (rating between 1 and 5),
  feedback text not null default '' check (length(feedback) <= 1000),
  ip_hash text not null,
  ts timestamptz not null default now(),
  foreign key (open_house_id, org_id) references open_houses (id, org_id) on delete cascade,
  foreign key (contact_id, org_id) references contacts (id, org_id) on delete cascade
);
create index on open_house_visits (open_house_id, ts);
create index on open_house_visits (ip_hash, ts);
alter table open_house_visits enable row level security;
-- Visits are written only by submit_checkin; the team reads them.
create policy "active org reads" on open_house_visits for select using (org_id = (select private.my_org()));
create policy "active org deletes" on open_house_visits for delete using (org_id = (select private.my_org()));

-- What the public sign-in page shows. Sign-in opens 1 hour before and closes 2 hours after.
create function public.open_house_info(p_id uuid)
returns table (address text, area text, price numeric, beds int, baths numeric, starts_at timestamptz, ends_at timestamptz, team text, open boolean)
language sql stable security definer set search_path = '' as $$
  select p.address, p.area, p.price, p.beds, p.baths, o.starts_at, o.ends_at,
         coalesce((select f.public_name from public.lead_forms f where f.org_id = o.org_id order by f.created_at limit 1), org.name),
         now() between o.starts_at - interval '1 hour' and o.ends_at + interval '2 hours'
  from public.open_houses o
  join public.properties p on p.id = o.property_id
  join public.organizations org on org.id = o.org_id
  where o.id = p_id
$$;
revoke execute on function public.open_house_info(uuid) from public;
grant execute on function public.open_house_info(uuid) to anon, authenticated;

create function private.checkin_unkeyed(
  p_oh uuid, p_ip_hash text, p_name text, p_email text, p_phone text, p_has_agent boolean,
  p_rating int, p_feedback text, p_consent_call_sms boolean, p_consent_email boolean
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  o public.open_houses;
  v_addr text;
  v_name text := left(btrim(regexp_replace(coalesce(p_name, ''), '[<>]', '', 'g')), 200);
  v_email text := nullif(lower(left(btrim(coalesce(p_email, '')), 320)), '');
  v_phone text := nullif(left(regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g'), 20), '');
  v_feedback text := left(btrim(coalesce(p_feedback, '')), 1000);
  v_contact uuid;
  v_owner uuid;
begin
  select * into o from public.open_houses where id = p_oh;
  if o.id is null or now() not between o.starts_at - interval '1 hour' and o.ends_at + interval '2 hours' then return 'closed'; end if;
  if length(v_name) = 0 or (v_email is null and v_phone is null) or p_has_agent is null then return 'invalid'; end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return 'invalid'; end if;
  if p_rating is not null and p_rating not between 1 and 5 then return 'invalid'; end if;
  if p_ip_hash is null or length(p_ip_hash) > 64 then return 'invalid'; end if;
  -- A door tablet signs in everyone from one connection, so the per-connection cap is generous.
  if (select count(*) from public.open_house_visits where ip_hash = p_ip_hash and ts > now() - interval '1 hour') >= 60
     or (select count(*) from public.open_house_visits where open_house_id = o.id) >= 500 then
    return 'limited';
  end if;
  select address into v_addr from public.properties where id = o.property_id;

  select id, owner_id into v_contact, v_owner from public.contacts
  where org_id = o.org_id and ((v_email is not null and lower(email) = v_email) or (v_phone is not null and phone = v_phone))
  order by created_at limit 1;

  if v_contact is null then
    -- The host meets them in person, so the host owns the lead (routing decides when there's no host).
    insert into public.contacts (org_id, owner_id, name, email, phone, sources, consent_call, consent_sms, consent_email, intent)
    values (o.org_id, o.host_id, v_name, v_email, v_phone, array['Open House'], coalesce(p_consent_call_sms, false),
            coalesce(p_consent_call_sms, false), coalesce(p_consent_email, false), 'Visited open house at ' || v_addr)
    returning id, owner_id into v_contact, v_owner;
  else
    update public.contacts set
      consent_call = consent_call or coalesce(p_consent_call_sms, false),
      consent_sms = consent_sms or coalesce(p_consent_call_sms, false),
      consent_email = consent_email or coalesce(p_consent_email, false),
      sources = case when 'Open House' = any(sources) then sources else sources || 'Open House'::text end
    where id = v_contact;
  end if;

  insert into public.open_house_visits (org_id, open_house_id, contact_id, has_agent, rating, feedback, ip_hash)
  values (o.org_id, o.id, v_contact, p_has_agent, p_rating, v_feedback, p_ip_hash);

  insert into public.activities (org_id, contact_id, user_id, channel, direction, content)
  values (o.org_id, v_contact, null, 'Note', 'in', left('Signed in at the open house, ' || v_addr
    || case when p_has_agent then '. Has an agent.' else '. No agent yet.' end
    || case when p_rating is not null then ' Rated the home ' || p_rating || '/5.' else '' end
    || case when v_feedback <> '' then ' "' || v_feedback || '"' else '' end, 10000));

  if not exists (select 1 from public.tasks where contact_id = v_contact and created_by = 'system' and not done
                 and title = left('Follow up: open house at ' || v_addr, 300)) then
    insert into public.tasks (org_id, contact_id, assignee_id, kind, title, note, due_at, created_by)
    values (o.org_id, v_contact, coalesce(v_owner, o.host_id), 'call', left('Follow up: open house at ' || v_addr, 300),
            case when p_has_agent
              then 'They said they work with an agent. Thank them for visiting; don''t solicit their business.'
              else 'No agent yet. Ask what they thought and what else they''re looking for.' end,
            greatest(o.ends_at, now()) + interval '1 day', 'system');
  end if;
  return 'ok';
end $$;

revoke execute on function private.checkin_unkeyed(uuid, text, text, text, text, boolean, int, text, boolean, boolean) from public, anon, authenticated;

create function public.submit_checkin(
  p_key text, p_oh uuid, p_ip_hash text, p_name text, p_email text, p_phone text, p_has_agent boolean,
  p_rating int, p_feedback text, p_consent_call_sms boolean, p_consent_email boolean
) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if not private.key_ok('form_rpc', p_key) then return 'forbidden'; end if;
  return private.checkin_unkeyed(p_oh, p_ip_hash, p_name, p_email, p_phone, p_has_agent, p_rating, p_feedback, p_consent_call_sms, p_consent_email);
end $$;
revoke execute on function public.submit_checkin(text, uuid, text, text, text, text, boolean, int, text, boolean, boolean) from public;
grant execute on function public.submit_checkin(text, uuid, text, text, text, text, boolean, int, text, boolean, boolean) to anon, authenticated;
