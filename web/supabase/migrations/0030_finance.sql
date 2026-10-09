-- Money: expenses (per deal and/or per lead source), commission payout approval, per-agent default split.

create table expenses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default private.my_org() references organizations on delete cascade,
  deal_id uuid,
  category text not null check (category in ('marketing', 'photography', 'staging', 'signage', 'mls_fees', 'client_gifts', 'travel', 'other')),
  source text check (source is null or length(source) <= 40),   -- lead source this marketing spend bought (Zillow, Facebook Ads...)
  amount numeric not null check (amount > 0 and amount < 1e9),
  spent_on date not null default current_date,
  vendor text not null default '' check (length(vendor) <= 120),
  note text not null default '' check (length(note) <= 500),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (deal_id, org_id) references deals (id, org_id) on delete set null (deal_id)
);
create index on expenses (org_id, spent_on desc);
create index on expenses (deal_id);
alter table expenses enable row level security;
create policy "active org" on expenses for all
  using (org_id = (select private.my_org())) with check (org_id = (select private.my_org()));

-- Payout workflow on closed deals: pending -> approved (owner/admin) -> paid.
alter table deals add column payout_status text not null default 'pending' check (payout_status in ('pending', 'approved', 'paid'));
alter table deals add column payout_approved_by uuid;
alter table deals add column payout_at timestamptz;

create function private.guard_payout() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.payout_status is distinct from old.payout_status then
    if (select private.my_role()) not in ('owner', 'admin') then raise exception 'Only owners and admins can approve or pay commissions'; end if;
    if new.status <> 'closed' and new.payout_status <> 'pending' then raise exception 'Only closed deals can be paid out'; end if;
    new.payout_approved_by := case when new.payout_status = 'pending' then null else coalesce(new.payout_approved_by, auth.uid()) end;
    new.payout_at := case when new.payout_status = 'paid' then now() else null end;
  end if;
  return new;
end $$;
create trigger guard_payout before update of payout_status on deals for each row execute function private.guard_payout();

-- Commission plan: each agent's default split, used to prefill new deals.
alter table memberships add column default_split_pct numeric(6,3) not null default 70 check (default_split_pct between 0 and 100);

-- Memberships have no UPDATE policy (it would allow role escalation); owners/admins set splits through this.
create function public.set_default_split(p_user uuid, p_pct numeric) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select private.my_role()) not in ('owner', 'admin') then raise exception 'Only owners and admins can set commission splits'; end if;
  if p_pct is null or p_pct < 0 or p_pct > 100 then raise exception 'Split must be between 0 and 100'; end if;
  update public.memberships set default_split_pct = p_pct where org_id = (select private.my_org()) and user_id = p_user;
end $$;
revoke execute on function public.set_default_split(uuid, numeric) from public, anon;
grant execute on function public.set_default_split(uuid, numeric) to authenticated;
