-- Booking page speaks as the form's public name (like the lead and valuation pages), never the internal org name.
do $$
declare src text := pg_get_functiondef('public.booking_info(text, uuid)'::regprocedure);
begin
  if position($r$'team', o.name,$r$ in src) = 0 then raise exception 'pattern not found'; end if;
  execute replace(src, $r$'team', o.name,$r$, $r$'team', coalesce(nullif(btrim(f.public_name), ''), 'our team'),$r$);
end $$;
