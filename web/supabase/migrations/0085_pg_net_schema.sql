-- pg_net belongs in the extensions schema, not public (its functions live in the net schema either way).
drop extension if exists pg_net;
create extension pg_net schema extensions;
