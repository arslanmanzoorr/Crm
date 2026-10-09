-- Team do-not-contact list: emails and phone numbers that must never be contacted. Any matching lead, existing
-- or future (forms, imports), is marked DNC by the database, so no code path can forget the check.

create table suppressions (
  org_id uuid not null default private.my_org() references organizations on delete cascade,
  kind text not null check (kind in ('email', 'phone')),
  value text not null check (length(value) between 3 and 320),
  reason text not null default '' check (length(reason) <= 200),
  added_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (org_id, kind, value)
);
alter table suppressions enable row level security;
create policy "active org" on suppressions for all
  using (org_id = (select private.my_org())) with check (org_id = (select private.my_org()));

-- Same normalization the lead form uses: lowercase emails, digits-and-plus phones.
create function private.norm_contact(kind text, v text) returns text
language sql immutable set search_path = '' as $$
  select case kind when 'email' then lower(btrim(v)) else regexp_replace(coalesce(v, ''), '[^0-9+]', '', 'g') end
$$;

create function private.normalize_suppression() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.value := private.norm_contact(new.kind, new.value);
  return new;
end $$;
create trigger normalize before insert or update on suppressions for each row execute function private.normalize_suppression();

-- New or edited leads: DNC if their email or phone is suppressed.
create function private.apply_suppression() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.suppressions s where s.org_id = new.org_id and (
       (s.kind = 'email' and new.email is not null and s.value = private.norm_contact('email', new.email)) or
       (s.kind = 'phone' and new.phone is not null and s.value = private.norm_contact('phone', new.phone)))) then
    new.dnc := true;
  end if;
  return new;
end $$;
create trigger suppression before insert or update of email, phone, dnc on contacts for each row execute function private.apply_suppression();

-- Adding to the list marks existing matching leads DNC right away.
create function private.suppress_existing() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.contacts set dnc = true
  where org_id = new.org_id and not dnc and (
    (new.kind = 'email' and email is not null and private.norm_contact('email', email) = new.value) or
    (new.kind = 'phone' and phone is not null and private.norm_contact('phone', phone) = new.value));
  return null;
end $$;
create trigger suppress_existing after insert on suppressions for each row execute function private.suppress_existing();
