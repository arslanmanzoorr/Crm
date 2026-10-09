-- Automated tasks are due 15 minutes after they're created, not at the same instant (which read as "Overdue").
do $$
declare src text;
begin
  select pg_get_functiondef('private.run_workflows()'::regprocedure) into src;
  src := replace(src, '                  now(), ''system'');', '                  now() + interval ''15 minutes'', ''system'');');
  if position('15 minutes' in src) = 0 then raise exception 'run_workflows: task insert pattern not found'; end if;
  execute src;
end $$;
