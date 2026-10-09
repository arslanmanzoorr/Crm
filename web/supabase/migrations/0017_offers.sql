-- Offers and their negotiation history. Seller side: offers received on one of our listings, compared side by side.
-- Buyer side: offers our client makes on any home. Accepting one opens a deal prefilled from it.

create table offers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default private.my_org() references organizations on delete cascade,
  side text not null check (side in ('buyer', 'seller')),
  property_id uuid,                 -- our listing (seller side, or a buyer offer on our own listing)
  contact_id uuid,                  -- our client when we represent the buyer
  buyer_name text not null default '' check (length(buyer_name) <= 200), -- the other side's buyer, seller side
  address text not null default '' check (length(address) <= 300),
  amount numeric not null check (amount > 0 and amount < 1e10),
  earnest numeric not null default 0 check (earnest >= 0 and earnest < 1e10),
  financing text not null default 'conventional' check (financing in ('cash', 'conventional', 'fha', 'va', 'usda', 'other')),
  down_pct numeric(5,2) check (down_pct between 0 and 100),
  seller_credit numeric not null default 0 check (seller_credit >= 0 and seller_credit < 1e10),
  contingencies text[] not null default '{}' check (contingencies <@ array['inspection', 'appraisal', 'financing', 'home_sale']::text[]),
  close_on date,
  expires_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'countered', 'accepted', 'rejected', 'withdrawn')),
  notes text not null default '' check (length(notes) <= 5000),
  deal_id uuid,
  created_at timestamptz not null default now(),
  unique (id, org_id),
  check (property_id is not null or length(btrim(address)) > 0),
  check (side = 'seller' or contact_id is not null),
  foreign key (property_id, org_id) references properties (id, org_id) on delete cascade,
  foreign key (contact_id, org_id) references contacts (id, org_id) on delete cascade,
  foreign key (deal_id, org_id) references deals (id, org_id) on delete set null (deal_id)
);
create index on offers (org_id, property_id);
create index on offers (contact_id);
alter table offers enable row level security;
create policy "active org" on offers for all
  using (org_id = (select private.my_org())) with check (org_id = (select private.my_org()));

-- Every step of the negotiation, in order. Written by the app when an offer is created, countered or decided.
create table offer_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default private.my_org(),
  offer_id uuid not null,
  kind text not null check (kind in ('drafted', 'submitted', 'received', 'countered', 'counter_received', 'accepted', 'rejected', 'withdrawn', 'note')),
  amount numeric check (amount > 0 and amount < 1e10),
  note text not null default '' check (length(note) <= 2000),
  user_id uuid default auth.uid(),
  ts timestamptz not null default now(),
  foreign key (offer_id, org_id) references offers (id, org_id) on delete cascade
);
create index on offer_events (offer_id, ts);
alter table offer_events enable row level security;
create policy "active org" on offer_events for all
  using (org_id = (select private.my_org())) with check (org_id = (select private.my_org()));

create trigger audit after insert or update or delete on offers for each row execute function private.audit();

-- Erase on delete covers offers (their notes and buyer names can identify people).
create or replace function private.audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r record := coalesce(new, old);
begin
  if tg_op = 'UPDATE' and (to_jsonb(new) - 'last_activity_at' - 'search' - 'first_response_at')
                        = (to_jsonb(old) - 'last_activity_at' - 'search' - 'first_response_at') then
    return null;
  end if;

  if tg_op = 'DELETE' and tg_table_name = 'contacts' then
    -- ponytail: scans the org's audit rows by jsonb; add an indexed contact_id column if audit_log gets huge
    update public.audit_log set before = null, after = null
    where org_id = old.org_id
      and ((entity = 'contacts' and entity_id = old.id)
        or (entity in ('tasks', 'deals', 'offers') and (before->>'contact_id' = old.id::text or after->>'contact_id' = old.id::text)));
  end if;

  insert into public.audit_log (org_id, actor, action, entity, entity_id, before, after)
  values (r.org_id, auth.uid(), lower(tg_op), tg_table_name, r.id,
          case when tg_op = 'DELETE' and tg_table_name in ('contacts', 'tasks', 'deals', 'offers') then null
               when tg_op <> 'INSERT' then to_jsonb(old) - 'search' end,
          case when tg_op <> 'DELETE' then to_jsonb(new) - 'search' end);
  return null;
end $$;
