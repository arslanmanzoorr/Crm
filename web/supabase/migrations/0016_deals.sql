-- Deals (transactions): one per client per side, with a milestone checklist and the commission terms.

create table deals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default private.my_org() references organizations on delete cascade,
  contact_id uuid not null,
  property_id uuid,
  owner_id uuid default auth.uid(),
  side text not null check (side in ('buyer', 'seller')),
  status text not null default 'active' check (status in ('active', 'closed', 'fell_through')),
  address text not null default '' check (length(address) <= 300), -- for homes that aren't one of our listings
  price numeric not null check (price >= 0 and price < 1e10),
  accepted_on date not null,
  close_on date,
  commission_pct numeric(6,3) not null default 3 check (commission_pct between 0 and 100),
  agent_split_pct numeric(6,3) not null default 70 check (agent_split_pct between 0 and 100),
  referral_pct numeric(6,3) not null default 0 check (referral_pct between 0 and 100),
  notes text not null default '' check (length(notes) <= 5000),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, org_id),
  check (close_on is null or close_on >= accepted_on),
  foreign key (contact_id, org_id) references contacts (id, org_id) on delete cascade,
  foreign key (property_id, org_id) references properties (id, org_id) on delete set null (property_id),
  foreign key (org_id, owner_id) references memberships (org_id, user_id) on delete set null (owner_id)
);
create index on deals (org_id, status, close_on);
create index on deals (contact_id);
create index on deals (property_id);
alter table deals enable row level security;
create policy "active org" on deals for all
  using (org_id = (select private.my_org())) with check (org_id = (select private.my_org()));

create table deal_milestones (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default private.my_org(),
  deal_id uuid not null,
  title text not null check (length(btrim(title)) between 1 and 200),
  due_on date,
  done_at timestamptz,
  position int not null default 0,
  foreign key (deal_id, org_id) references deals (id, org_id) on delete cascade
);
create index on deal_milestones (deal_id, position);
alter table deal_milestones enable row level security;
create policy "active org" on deal_milestones for all
  using (org_id = (select private.my_org())) with check (org_id = (select private.my_org()));

create trigger audit after insert or update or delete on deals for each row execute function private.audit();

-- Erase on delete (0014) now covers deals too: their notes can name the client.
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
        or (entity in ('tasks', 'deals') and (before->>'contact_id' = old.id::text or after->>'contact_id' = old.id::text)));
  end if;

  insert into public.audit_log (org_id, actor, action, entity, entity_id, before, after)
  values (r.org_id, auth.uid(), lower(tg_op), tg_table_name, r.id,
          case when tg_op = 'DELETE' and tg_table_name in ('contacts', 'tasks', 'deals') then null
               when tg_op <> 'INSERT' then to_jsonb(old) - 'search' end,
          case when tg_op <> 'DELETE' then to_jsonb(new) - 'search' end);
  return null;
end $$;
