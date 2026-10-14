# Security audit, functionality test and pentest

Date: 2026-10-14. Scope: everything in `web/` and the Supabase project PropertyOS, as built up to migration 0069.
Method: read the database policies, grants and functions; attacked the live dev app and database as an anonymous
visitor, as a member of another team, and as a team owner; drove every page and the main flows in a real browser.

## Findings

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | **Critical** | **Cross-team takeover.** `memberships` had table-wide UPDATE, and the owner's row policy only checked the new `role`. A team owner could rewrite one of their members' rows into *themselves* as **admin of any other team** (changing `org_id`, `user_id` and `role` in one update). Team ids are not secret (they appear in the Zillow feed and in file paths). Confirmed in a rolled-back transaction. | Fixed in `0069_column_grants.sql`: users may only update `memberships.role`. Re-tested: blocked; role changes still work. |
| 2 | High | Admins could change `organizations.plan` (billing tier) directly through the API. | Fixed in `0069`: organization updates are limited to the settings columns the app uses. |
| 3 | Low | `safeNext` (post-login redirect) didn't reject tabs or backslashes. Next.js percent-encodes them in the `Location` header, so it wasn't exploitable here. | Hardened anyway: any control character or backslash is refused. Tests added. |
| 4 | Low | Calendar (.ics) files escaped `\n` but not a lone `\r`; some calendar apps split lines on it, which would let a lead's name add fake calendar fields. | Fixed; test added. |
| 5 | Info | The printed template page had no H1 (accessibility). | Fixed. |

## What was attacked and held

- **Tenant isolation:** with a simulated outsider (no membership in the target team), RLS returned nothing for contacts, the organization, members, storage files and API keys. Switching into the team, joining it, editing the profile's active team and creating portal links were all refused.
- **Anonymous REST:** the public key has no table access at all. Every SECURITY DEFINER function anon can call is gated by the server key, a 256-bit link token (stored only as a SHA-256 hash), or an API key (hash only).
- **App routes:** `/api/ai`, `/api/export`, `/api/publish`, `.ics` and `/api/v1` refuse unauthenticated callers (401). Private pages redirect to sign-in. Malformed tokens get "not found" pages, never data.
- **Two-step sign-in:** a password-only session of an enrolled user gets no team data at all (enforced in the database), and pages redirect to `/mfa`.
- **Abuse:** web form limited to 5 per visitor per hour (verified); bots that submit in under 2.5 s are dropped silently (verified not saved); a booked showing slot disappears for everyone; website chat and API keys are rate-limited.
- **Injection:** search input is neutralized before it reaches PostgREST filters; CSV exports prefix formula cells; no HTML from user or AI content is rendered (the only `dangerouslySetInnerHTML` is QR SVG built from our own URLs); uploads are size- and type-checked in the app and again by bucket limits, and served as attachments with `nosniff`.
- **Headers:** CSP (`default-src 'self'`, no third-party scripts, `frame-ancestors 'none'` except embeddable `/f/` forms), HSTS with preload, nosniff, DENY framing, strict referrer; portal and coordinator links add `no-referrer`, `noindex` and `no-store`.
- **Supply chain:** `npm audit --omit=dev`: 0 vulnerabilities. No secrets in git history (only `sk-or-...` placeholders in the README); no `.env` file tracked.
- **Supabase security advisor:** only the intended token- or key-gated functions, plus leaked-password protection (owner to-do).

## Functionality test

All 45 app pages loaded signed-in with no server or console errors: list pages, detail pages for a lead, deal,
offer, listing, open house, filled template and studio, plus all public pages. Flows driven end to end:

- Create a lead, log a note (shows without a reload), edit, find it in the list.
- Public web form: lead routed to an owner, email consent only, 5-minute call task.
- Open house sign-in and showing booking.
- Client portal: create the link, open it signed out, save a home, leave a note; all logged on the timeline.
- Coordinator link, document templates, branding, API keys, calling hours, two-step sign-in (earlier today).
- Accessibility (axe) on the 12 newest pages: clean after fix 5.

## Owner to-dos (outside the code)

- Turn on Supabase leaked-password protection, set the Site URL, delete the test users before launch.
- Set `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY` and the other server variables on the host; never prefix them `NEXT_PUBLIC_`.
- The in-memory limits (website chat, API) count per server instance; move them to the database before scaling to more than one instance.
- Consider a third-party penetration test before handling real client data at scale; this audit is thorough but not independent.
