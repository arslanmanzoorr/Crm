-- Security fix (pentest, critical): UPDATE was granted on whole tables, so the row policies were the only guard.
-- On memberships the owner's policy checked the new role but not the other columns: an owner could rewrite a
-- member's row into themselves as admin of ANY other team (org_id, user_id, role in one update). Users now may
-- only write the columns the app actually changes. Same for organizations, where admins could also set `plan`.
revoke update on public.memberships from anon, authenticated;
grant update (role) on public.memberships to authenticated;

revoke update on public.organizations from anon, authenticated;
grant update (name, time_zone, routing, review_url, split_tiers, brand_color, hide_powered_by, call_start, call_end, recording_all_party)
  on public.organizations to authenticated;
