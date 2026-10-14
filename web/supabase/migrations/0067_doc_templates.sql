-- Document templates: the team's own wording (from their broker, attorney or state association) with {{fields}}
-- filled from a deal. EstateOS ships no legal forms. Everyone on the team can use them; owners and admins edit.
create table public.doc_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default private.my_org() references public.organizations (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  state text check (state ~ '^[A-Z]{2}$'),
  body text not null check (length(body) between 1 and 50000),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (org_id, name)
);
create index doc_templates_created_by_idx on public.doc_templates (created_by);
alter table public.doc_templates enable row level security;
create policy "members read" on public.doc_templates for select to authenticated using (org_id = (select private.my_org()));
create policy "admins insert" on public.doc_templates for insert to authenticated
  with check (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'));
create policy "admins update" on public.doc_templates for update to authenticated
  using (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'))
  with check (org_id = (select private.my_org()));
create policy "admins delete" on public.doc_templates for delete to authenticated
  using (org_id = (select private.my_org()) and (select private.my_role()) in ('owner', 'admin'));
