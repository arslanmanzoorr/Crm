-- Listing history: every status and price change, written by a trigger. Plus the listing agreement's expiry date.

alter table properties add column listing_expires date;

create table property_events (
  id bigint generated always as identity primary key,
  org_id uuid not null,
  property_id uuid not null,
  kind text not null check (kind in ('listed', 'price', 'status')),
  old_value text,
  new_value text,
  user_id uuid default auth.uid(),
  ts timestamptz not null default now(),
  foreign key (property_id, org_id) references properties (id, org_id) on delete cascade
);
create index on property_events (property_id, ts);
alter table property_events enable row level security;
create policy "active org reads" on property_events for select using (org_id = (select private.my_org()));

create function private.property_history() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.property_events (org_id, property_id, kind, new_value) values (new.org_id, new.id, 'listed', new.status || ' at ' || new.price);
  else
    if new.price is distinct from old.price then
      insert into public.property_events (org_id, property_id, kind, old_value, new_value) values (new.org_id, new.id, 'price', old.price::text, new.price::text);
    end if;
    if new.status is distinct from old.status then
      insert into public.property_events (org_id, property_id, kind, old_value, new_value) values (new.org_id, new.id, 'status', old.status, new.status);
    end if;
  end if;
  return null;
end $$;
create trigger history after insert or update of price, status on properties for each row execute function private.property_history();

-- Existing listings start their history today.
insert into property_events (org_id, property_id, kind, new_value, user_id, ts)
select org_id, id, 'listed', status || ' at ' || price, null, created_at from properties;
