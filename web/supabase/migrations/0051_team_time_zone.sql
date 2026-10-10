-- The team's time zone (IANA name, e.g. America/Chicago). Booking slots use its business hours; null = visitor's clock.
alter table organizations add column time_zone text check (time_zone ~ '^[A-Za-z]+(/[A-Za-z_+-]+){1,2}$');

do $$
declare src text := pg_get_functiondef('public.booking_info(text, uuid)'::regprocedure);
begin
  if position($r$'listings', coalesce(($r$ in src) = 0 then raise exception 'pattern not found'; end if;
  execute replace(src, $r$'listings', coalesce(($r$, $r$'tz', o.time_zone, 'listings', coalesce(($r$);
end $$;
