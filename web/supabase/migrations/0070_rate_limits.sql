-- Rate limits for the last unlimited write paths, enforced in the database so calling the RPC directly can't skip
-- them. Each writes to the lead's timeline, so a leaked link or key could otherwise flood an agent's view.
--   portal_note / portal_favorite: 30 a link per hour   tc_milestone: 120 a link per hour
--   api_create_lead: 300 leads per key per hour (on top of the app's 120 requests a minute)
-- Plus the last unbounded user-writable fields, and API keys can only be revoked, never edited.

create or replace function private.patch_fn(p_fn regprocedure, p_from text, p_to text) returns void
language plpgsql set search_path = '' as $$
declare d text := pg_get_functiondef(p_fn);
begin
  if position(p_from in d) = 0 then raise exception 'pattern not found in %', p_fn; end if;
  execute replace(d, p_from, p_to);
end $$;

select private.patch_fn('public.portal_note(text, uuid, text)',
  $p$if l.id is null then return 'closed'; end if;$p$,
  $p$if l.id is null then return 'closed'; end if;
  if (select count(*) from public.activities where contact_id = l.contact_id and content like 'Note on % in the client portal:%' and ts > now() - interval '1 hour') >= 30 then return 'limited'; end if;$p$);

select private.patch_fn('public.portal_favorite(text, uuid, boolean)',
  $p$if l.id is null then return 'closed'; end if;$p$,
  $p$if l.id is null then return 'closed'; end if;
  if (select count(*) from public.activities where contact_id = l.contact_id and content like 'Saved % in the client portal' and ts > now() - interval '1 hour') >= 30 then return 'limited'; end if;$p$);

select private.patch_fn('public.tc_milestone(text, uuid, boolean)',
  $p$if l.id is null then return false; end if;$p$,
  $p$if l.id is null then return false; end if;
  if (select count(*) from public.activities a join public.deals d on d.contact_id = a.contact_id and d.id = l.deal_id
      where a.content like l.label || ' %: %' and a.ts > now() - interval '1 hour') >= 120 then return false; end if;$p$);

select private.patch_fn('public.api_create_lead(text, text, text, text, text, text, boolean, boolean)',
  $p$if k.id is null then return null; end if;$p$,
  $p$if k.id is null then return null; end if;
  if (select count(*) from public.activities where org_id = k.org_id and content like 'API (' || k.name || ')%' and ts > now() - interval '1 hour') >= 300 then
    return jsonb_build_object('error', 'rate limit: 300 leads an hour per key');
  end if;$p$);

drop function private.patch_fn(regprocedure, text, text);

alter table public.workflows
  add constraint workflows_stop_stages_size check (cardinality(stop_stages) <= 20),
  add constraint workflows_template_size check (template is null or length(template) <= 60);

revoke update on public.api_keys from anon, authenticated;
grant update (revoked_at) on public.api_keys to authenticated;
