-- Security fix: the anon storage read rules from 0048 (rental feed photos) and 0055 (documents shared with a
-- client) also let anyone with the public key LIST those buckets, exposing team folders and file paths across
-- teams. Anonymous visitors get no storage access at all again. The portal and feed routes now fetch files on
-- the server with the service-role key, after the token checks (portal_document / rental_feed_photo) pass.
drop policy if exists "shared with client" on storage.objects;
drop policy if exists "rental feed photos" on storage.objects;
drop function if exists feed.shared_doc_ok(text);
drop function if exists feed.photo_ok(text);
drop schema if exists feed;
