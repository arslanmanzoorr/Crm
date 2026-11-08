-- Plans (web/src/lib/plans.ts): starter, pro, team, billed per agent, monthly or yearly.
-- Early access: billing is not live, so every team starts on Team (everything on) and owners/admins may switch plans
-- freely to see what each includes. When billing goes live, plan changes must come only from the billing provider:
-- revoke the column grant below in that migration.
-- organizations.plan has existed since 0001 ('solo', never read by the app): reuse it with the real plan names.
update public.organizations set plan = 'team';
alter table public.organizations
  alter column plan set default 'team',
  add constraint organizations_plan_check check (plan in ('starter', 'pro', 'team')),
  add column plan_interval text not null default 'month' check (plan_interval in ('month', 'year'));
grant update (plan, plan_interval) on public.organizations to authenticated; -- through the existing "admins rename org" policy

-- The app reads the plan with the rest of the team's settings (proxy and app shell).
create or replace function public.app_brand() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('color', coalesce(o.brand_color, a.brand_color), 'radius', o.button_radius, 'logo', coalesce(o.logo_path, a.logo_path),
    'off', to_jsonb(o.disabled_features),
    'name', o.name, 'theme', coalesce((select p.theme from public.user_prefs p where p.user_id = auth.uid()), o.theme),
    'domain', case when o.domain_verified then o.custom_domain end,
    'tour', coalesce((select p.tour from public.user_prefs p where p.user_id = auth.uid()), '{}'::jsonb),
    'role', (select private.my_role()),
    'agency', (select jsonb_build_object('id', ag.id, 'name', ag.name) from public.agency_members am join public.agencies ag on ag.id = am.agency_id
               where am.user_id = auth.uid() order by am.created_at limit 1),
    'via_agency', (select m.via_agency from public.memberships m where m.org_id = o.id and m.user_id = auth.uid()),
    'product', case when a.domain_verified then a.name end,
    'plan', o.plan, 'plan_interval', o.plan_interval)
  from public.organizations o left join public.agencies a on a.id = o.agency_id where o.id = (select private.my_org())
$$;

-- The website chat assistant is a Pro feature: on Starter the chat behaves as "People only" wherever its mode is read.
create or replace function private.chat_state(c public.web_chats, p_after bigint) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'mode', (select case when o.plan = 'starter' then 'off' else o.chat_ai end from public.organizations o where o.id = c.org_id),
    'human', c.human,
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'from', m.sender, 'text', m.body) order by m.id)
      from (select * from public.web_chat_messages where chat_id = c.id and id > coalesce(p_after, 0) order by id desc limit 30) m), '[]'))
$$;

create or replace function public.chat_say(p_key text, p_chat uuid, p_token text, p_sender text, p_text text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.web_chats; v_mode text; v_text text := left(btrim(coalesce(p_text, '')), 2000);
begin
  c := private.chat_for(p_key, p_chat, p_token);
  if c.id is null or p_sender not in ('visitor', 'ai') or v_text = '' then return null; end if;
  select case when plan = 'starter' then 'off' else chat_ai end into v_mode from public.organizations where id = c.org_id;
  if p_sender = 'ai' and (c.human or v_mode = 'off') then return private.chat_state(c, null); end if;
  if p_sender = 'visitor' and (select count(*) from public.web_chat_messages where chat_id = c.id and sender = 'visitor') >= 60 then
    return jsonb_build_object('error', 'limited');
  end if;
  insert into public.web_chat_messages (chat_id, org_id, sender, body) values (c.id, c.org_id, p_sender, v_text);
  update public.web_chats set last_at = now() where id = c.id;
  return private.chat_state(c, null);
end $$;

create or replace function public.chat_mode(p_key text, p_form uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case when o.plan = 'starter' then 'off' else o.chat_ai end from public.lead_forms f join public.organizations o on o.id = f.org_id
  where private.key_ok('form_rpc', p_key) and f.id = p_form and f.enabled
$$;

create or replace function public.chat_open(p_key text, p_form uuid, p_ip_hash text) returns jsonb
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
  return jsonb_build_object('id', v_id, 'token', v_token,
    'mode', (select case when plan = 'starter' then 'off' else chat_ai end from public.organizations where id = f.org_id));
end $$;
