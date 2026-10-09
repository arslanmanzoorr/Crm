-- Virtual tour and floor plan links (https only), and broker approval of listings agents add.

alter table properties add column tour_url text check (tour_url is null or (tour_url ~ '^https://' and length(tour_url) <= 500));
alter table properties add column floor_plan_url text check (floor_plan_url is null or (floor_plan_url ~ '^https://' and length(floor_plan_url) <= 500));
alter table properties add column approved_at timestamptz;
alter table properties add column approved_by uuid;

-- Listings that exist today count as approved.
update properties set approved_at = created_at where approved_at is null;

-- Owners/admins: new listings are approved on creation. Agents: they wait for approval.
-- Only owners/admins can set or clear approval, whatever the client sends.
create function private.listing_approval() returns trigger
language plpgsql security definer set search_path = '' as $$
declare admin boolean := (select private.my_role()) in ('owner', 'admin');
begin
  if tg_op = 'INSERT' then
    new.approved_at := case when admin then now() else null end;
    new.approved_by := case when admin then auth.uid() else null end;
  elsif (new.approved_at is distinct from old.approved_at or new.approved_by is distinct from old.approved_by) and not admin then
    new.approved_at := old.approved_at;
    new.approved_by := old.approved_by;
  end if;
  return new;
end $$;
create trigger approval before insert or update on properties for each row execute function private.listing_approval();
