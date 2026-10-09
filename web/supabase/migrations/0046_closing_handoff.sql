-- When a deal closes: a handoff task for the agent, and on the buy side the home goes on the client's
-- "Homes they own" list (once per address), so equity check-ins start from the real purchase.

create function private.deal_handoff() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p numeric := case when new.price > 0 and new.price < 1e10 then new.price end;
begin
  insert into public.tasks (org_id, contact_id, assignee_id, kind, title, note, due_at, created_by)
  values (new.org_id, new.contact_id, new.owner_id, 'call', left('Closing handoff: ' || new.address, 200),
    case new.side when 'buyer'
      then 'Keys and codes, utilities transferred, home warranty registered, final documents sent, moving help if needed.'
      else 'Keys handed over, utilities closed out, proceeds confirmed, final documents sent, forwarding address saved.' end,
    now() + interval '1 day', 'system');
  if new.side = 'buyer' and btrim(new.address) <> '' and not exists (
    select 1 from public.owned_homes h where h.contact_id = new.contact_id and lower(btrim(h.address)) = lower(btrim(new.address))
  ) then
    insert into public.owned_homes (org_id, contact_id, address, purchase_price, purchased_on, value_estimate, notes)
    values (new.org_id, new.contact_id, left(new.address, 300), p, coalesce(new.close_on, current_date), p, 'Bought with us');
  end if;
  return null;
end $$;

create trigger handoff after update of status on deals for each row
  when (new.status = 'closed' and old.status is distinct from 'closed') execute function private.deal_handoff();
