-- Website chat as real conversations: every chat is saved, the team picks what the AI does (off / answers questions /
-- answers and books showings), and anyone on the team can take a chat over from the Inbox; the AI then stays quiet.
-- Visitors hold a random token for their own chat; only its hash is stored. Public functions are keyed like the
-- other public RPCs (FORM_RPC_KEY), so only the app server can call them.

alter table public.organizations
  add column chat_ai text not null default 'answer' check (chat_ai in ('off', 'answer', 'book'));
grant update (chat_ai) on public.organizations to authenticated;

create table public.web_chats (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  form_id uuid references public.lead_forms(id) on delete set null,
  token_hash text not null,
  ip_hash text,
  contact_id uuid references public.contacts(id) on delete cascade, -- set once the visitor books; deleting the lead deletes the chat
  human boolean not null default false,        -- a person took over; the AI stays quiet
  wants_person boolean not null default false, -- the visitor asked for a person and nobody has answered yet
  created_at timestamptz not null default now(),
  last_at timestamptz not null default now()
);
create index web_chats_org_last on public.web_chats (org_id, last_at desc);
create index web_chats_ip on public.web_chats (ip_hash, created_at);
create index web_chats_contact on public.web_chats (contact_id);

create table public.web_chat_messages (
  id bigint generated always as identity primary key,
  chat_id uuid not null references public.web_chats(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  sender text not null check (sender in ('visitor', 'ai', 'agent')),
  user_id uuid references auth.users(id) on delete set null,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index web_chat_messages_chat on public.web_chat_messages (chat_id, id);
create index web_chat_messages_user on public.web_chat_messages (user_id);

alter table public.web_chats enable row level security;
alter table public.web_chat_messages enable row level security;
create policy "members read" on public.web_chats for select using (org_id = (select private.my_org()));
create policy "members read" on public.web_chat_messages for select using (org_id = (select private.my_org()));
-- No direct writes: everything goes through the functions below.

-- Visitor's chat, checked by token. Null when the key, chat or token is wrong.
create function private.chat_for(p_key text, p_chat uuid, p_token text) returns public.web_chats
language sql stable security definer set search_path = '' as $$
  select c.* from public.web_chats c
  where private.key_ok('form_rpc', p_key) and c.id = p_chat
    and c.token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
$$;

create function private.chat_state(c public.web_chats, p_after bigint) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'mode', (select o.chat_ai from public.organizations o where o.id = c.org_id),
    'human', c.human,
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'from', m.sender, 'text', m.body) order by m.id)
      from (select * from public.web_chat_messages where chat_id = c.id and id > coalesce(p_after, 0) order by id desc limit 30) m), '[]'))
$$;

/** Start a chat for a lead form. Returns {id, token, mode}; 'limited' after 10 chats an hour from one connection. */
create function public.chat_open(p_key text, p_form uuid, p_ip_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare f public.lead_forms; v_token text; v_id uuid;
begin
  if not private.key_ok('form_rpc', p_key) then return null; end if;
  select * into f from public.lead_forms where id = p_form and enabled;
  if f.id is null then return null; end if;
  if (select count(*) from public.web_chats where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 10 then
    return jsonb_build_object('error', 'limited');
  end if;
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.web_chats (org_id, form_id, token_hash, ip_hash)
  values (f.org_id, f.id, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), left(p_ip_hash, 64)) returning id into v_id;
  return jsonb_build_object('id', v_id, 'token', v_token, 'mode', (select chat_ai from public.organizations where id = f.org_id));
end $$;

/**
 * Add a visitor or AI message. An AI message is dropped when a person has taken over or the AI is off.
 * Returns the state with the last 30 messages (the AI's context), or null for a bad token.
 */
create function public.chat_say(p_key text, p_chat uuid, p_token text, p_sender text, p_text text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.web_chats; v_mode text; v_text text := left(btrim(coalesce(p_text, '')), 2000);
begin
  c := private.chat_for(p_key, p_chat, p_token);
  if c.id is null or p_sender not in ('visitor', 'ai') or v_text = '' then return null; end if;
  select chat_ai into v_mode from public.organizations where id = c.org_id;
  if p_sender = 'ai' and (c.human or v_mode = 'off') then return private.chat_state(c, null); end if;
  if p_sender = 'visitor' and (select count(*) from public.web_chat_messages where chat_id = c.id and sender = 'visitor') >= 60 then
    return jsonb_build_object('error', 'limited');
  end if;
  insert into public.web_chat_messages (chat_id, org_id, sender, body) values (c.id, c.org_id, p_sender, v_text);
  update public.web_chats set last_at = now() where id = c.id;
  return private.chat_state(c, null);
end $$;

/** New messages since `p_after` (the visitor's page polls this while a person is on the chat). */
create function public.chat_read(p_key text, p_chat uuid, p_token text, p_after bigint) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c public.web_chats;
begin
  c := private.chat_for(p_key, p_chat, p_token);
  if c.id is null then return null; end if;
  return private.chat_state(c, p_after);
end $$;

/** The visitor asked for a person: flag it for the Inbox and stop the AI. */
create function public.chat_want_person(p_key text, p_chat uuid, p_token text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare c public.web_chats;
begin
  c := private.chat_for(p_key, p_chat, p_token);
  if c.id is null then return false; end if;
  update public.web_chats set wants_person = true, human = true, last_at = now() where id = c.id;
  return true;
end $$;

/** After a booking from the chat: attach the chat to the lead the booking created or matched. */
create function public.chat_link(p_key text, p_chat uuid, p_token text, p_email text, p_phone text) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.web_chats; v_contact uuid;
  v_email text := nullif(lower(left(btrim(coalesce(p_email, '')), 320)), '');
  v_phone text := nullif(left(regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g'), 20), '');
begin
  c := private.chat_for(p_key, p_chat, p_token);
  if c.id is null or c.contact_id is not null then return; end if;
  -- Only a lead that just booked (a showing requested in the last 10 minutes), so a chat can't be pinned on anyone else.
  select ct.id into v_contact from public.contacts ct
  where ct.org_id = c.org_id and ((v_email is not null and lower(ct.email) = v_email) or (v_phone is not null and ct.phone = v_phone))
    and exists (select 1 from public.showings s where s.contact_id = ct.id and s.created_at > now() - interval '10 minutes')
  order by ct.created_at limit 1;
  if v_contact is not null then update public.web_chats set contact_id = v_contact where id = c.id; end if;
end $$;

/** Team side: take a chat over (the AI stops) or hand it back. */
create function public.chat_takeover(p_chat uuid, p_human boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not (select private.mfa_ok()) then return false; end if;
  update public.web_chats set human = p_human, wants_person = case when p_human then wants_person else false end
  where id = p_chat and org_id = (select private.my_org());
  return found;
end $$;

/** Team side: reply in a chat. Replying takes it over and answers a "wants a person" request. */
create function public.chat_reply(p_chat uuid, p_text text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare c public.web_chats; v_text text := left(btrim(coalesce(p_text, '')), 2000);
begin
  if not (select private.mfa_ok()) or v_text = '' then return false; end if;
  select * into c from public.web_chats where id = p_chat and org_id = (select private.my_org());
  if c.id is null then return false; end if;
  insert into public.web_chat_messages (chat_id, org_id, sender, user_id, body) values (c.id, c.org_id, 'agent', auth.uid(), v_text);
  update public.web_chats set human = true, wants_person = false, last_at = now() where id = c.id;
  return true;
end $$;

revoke execute on function private.chat_for(text, uuid, text), private.chat_state(public.web_chats, bigint) from public;
revoke execute on function public.chat_open(text, uuid, text), public.chat_say(text, uuid, text, text, text), public.chat_read(text, uuid, text, bigint),
  public.chat_want_person(text, uuid, text), public.chat_link(text, uuid, text, text, text), public.chat_takeover(uuid, boolean), public.chat_reply(uuid, text) from public;
grant execute on function public.chat_open(text, uuid, text), public.chat_say(text, uuid, text, text, text), public.chat_read(text, uuid, text, bigint),
  public.chat_want_person(text, uuid, text), public.chat_link(text, uuid, text, text, text) to anon, authenticated;
revoke execute on function public.chat_takeover(uuid, boolean), public.chat_reply(uuid, text) from anon;
grant execute on function public.chat_takeover(uuid, boolean), public.chat_reply(uuid, text) to authenticated;

-- Anonymous chats that never became a lead are deleted after 90 days.
select cron.schedule('estateos-chat-retention', '17 3 * * *',
  $$delete from public.web_chats where contact_id is null and last_at < now() - interval '90 days'$$);

-- What the chat page shows before the first message (null when the form is closed).
create function public.chat_mode(p_key text, p_form uuid) returns text
language sql stable security definer set search_path = '' as $$
  select o.chat_ai from public.lead_forms f join public.organizations o on o.id = f.org_id
  where private.key_ok('form_rpc', p_key) and f.id = p_form and f.enabled
$$;
revoke execute on function public.chat_mode(text, uuid) from public;
grant execute on function public.chat_mode(text, uuid) to anon, authenticated;
