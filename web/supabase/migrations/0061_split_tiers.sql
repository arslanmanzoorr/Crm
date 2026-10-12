-- Tiered commission plans: as an agent's gross commission closed this calendar year passes each threshold, new
-- deals suggest a higher split. Team-wide; an agent's own default split still applies when it is higher.
alter table public.organizations add column split_tiers jsonb not null default '[]'
  check (jsonb_typeof(split_tiers) = 'array' and jsonb_array_length(split_tiers) <= 5);
