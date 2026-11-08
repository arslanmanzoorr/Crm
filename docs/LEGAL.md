# Legal and compliance checklist

Status of the owner's 33-point checklist (2026-11-08). "Done" items were checked in the code and in a real browser.
Business details for every policy live in `web/src/lib/legal.ts`. Fill in `entity`, `state` and `address` there once the LLC exists;
the pages show them automatically (until then they are left out, never guessed).

**Have a lawyer read the Terms, Privacy Policy, DPA and Refund policy before charging money or signing brokerages.**

| # | Item | Status | Where / evidence | Owner action |
|---|---|---|---|---|
| 1 | Privacy Policy | Done | `/legal/privacy` | Create the `privacy@estos.app` mailbox; lawyer review |
| 2 | Terms of Service | Done | `/legal/terms` | Set `state` (governing-law clause appears then); lawyer review |
| 3 | Cookie banner | Done | Notice on the public site and legal pages | None. Only essential sign-in cookies exist, so there is nothing to accept or refuse |
| 4 | Unsubscribe in marketing email | Done (already) | One-click unsubscribe header and link; sending refused without a postal address | None |
| 5 | Data retention limits | Done | Policy: anonymous chats deleted at 90 days (automatic), deleted leads erased at once, closed accounts deleted within 30 days | Account closures are handled by hand for now: delete the team in Supabase within 30 days of a request |
| 6 | Colour contrast | Done | axe (WCAG 2.1 AA): 0 violations on the site, store, login, accept screen, all legal pages, lead form, chat, booking, privacy choices, Today, Inbox, Account (desktop and phone) | None |
| 7 | Fake countdown timers | None found | Site and app searched | None |
| 8 | Alt text | Done | axe image-alt passes everywhere checked; decorative images are marked as decorative | None |
| 9 | Keyboard navigation | Done | Tab order verified; **fixed**: checkboxes and radios had no visible focus | None |
| 10 | Customer logos without permission | None found | Only Estos and the Google sign-in mark (used per Google's branding rules) | Don't add "as used by" logos without written permission |
| 11 | Image, font and code licences | Done | Fonts: SIL OFL. Icons: ISC. All libraries permissive. Site images are screenshots of Estos itself. Stock photos in the ad and demo team: Unsplash licence (commercial use allowed) | None |
| 12 | Data access and deletion requests | Done | In-app export (owners/admins); "Your privacy choices" on every lead form; `privacy@` for access, deletion and account closure; 45-day answer, appeals | Answer requests within 45 days |
| 13 | Dark patterns | Done | No pre-ticked consent; neutral cookie notice; refund policy promises online cancel; misleading claims fixed (see 20) | None |
| 14 | AI-generated labels | Done | Website chat says answers are automated; AI drafts marked; **added**: "AI draft" note in the Inbox reply box | None |
| 15 | Checkboxes to agree to Terms and Privacy | Done | Sign-up form and `/accept` screen; required, never pre-ticked | None |
| 16 | Refund policy | Done | `/legal/refunds` | Confirm the 14-day first-charge refund (`refundDays` in `legal.ts`) is the policy you want |
| 17 | Easy cancellation | Committed | No paid plans yet; policy promises in-app cancel "the same way you signed up" | When Stripe is added, build in-app cancel before taking the first payment (FTC and state auto-renewal laws) |
| 18 | Stop collecting unnecessary data | Done | Forms ask only for contact details and consent; IPs stored only as salted hashes; no ID or financial numbers | None |
| 19 | Fake reviews | None found | The site shows no reviews. The in-app testimonials feature publishes only with the client's permission flag | Never add made-up reviews or ratings |
| 20 | Unsupported claims | Fixed | "Nothing reaches a client until a person sends it" was false (website chat assistant); "Fair Housing checks" overstated; "Every AI call is logged and capped" reworded | Keep claims matched to what the product does |
| 21 | Record acceptance of terms | Done | Version, server timestamp and the separate marketing choice saved on the account at sign-up or on `/accept`; anyone without the current version is sent to `/accept` (also right after sign-in and two-step sign-in) | Bump `termsVersion` after a material change; everyone accepts again |
| 22 | Open-source licence obligations | Done | `/legal/open-source` lists every package and licence (`npm run licenses` regenerates it) | Re-run after adding dependencies |
| 23 | Separate marketing consent | Done | Optional, unticked "product news" box, separate from the Terms box; lead forms already ask for calls/texts and email separately | None |
| 24 | False SOC claims | None found | No SOC 2, ISO or HIPAA claims anywhere | Don't claim them until audited |
| 25 | DMCA | Partly | Terms section 9 explains how to send a notice | **Register a DMCA agent** at copyright.gov (US $6, renew every 3 years); needed for the safe harbor |
| 26 | No AI training on user data | Done | Every AI request goes only to providers that neither store nor train on prompts (OpenRouter `data_collection: deny`, tested with both models) | In OpenRouter settings, keep prompt logging off |
| 27 | Disclose auto-renewal | Committed | Refund policy states it | Show it at checkout when billing is added |
| 28 | Audit third-party SDKs, analytics, tracking | Done | None in the app; the site's security policy blocks third-party scripts. Outside services called: Supabase, Vercel, OpenRouter, Resend, Google | None |
| 29 | Data processing agreements | Partly | Customer DPA published at `/legal/dpa` | Accept the DPAs of Supabase, Vercel, Resend, OpenRouter and Google (each has one in its dashboard or terms) |
| 30 | Block trackers until consent | Done | There are no trackers to block, and the security policy stops any from loading | If analytics are ever added, they must wait for opt-in |
| 31 | Subprocessor list | Done | `/legal/subprocessors` | Email owners 14 days before adding one (promised in the DPA) |
| 32 | Realistic uptime commitments | Done | No uptime claims on the site; Terms state there is no uptime guarantee | None |
| 33 | Hidden fees | None | Free today; refund policy forbids hidden fees | None |
| 34 | Business contact details | Partly | Footer and every policy show `support@estos.app` | Fill in the legal name and address in `legal.ts`; create the mailboxes |

## Found during the check

- **The database is in Frankfurt, Germany** (AWS eu-central-1), while the app runs in the US. The policies now say so.
  Moving the Supabase project to a US region would make every page faster for US users.
- **The website chat assistant was on by default**, though the brief asked for opt-in. Migration `0087_chat_ai_opt_in.sql` turns it off
  by default. It is **not applied yet**: the Supabase connection in the last session pointed at a different account.
- Acceptance is stored on the account record. Once database access is back, an append-only acceptances table would make the record tamper-proof.
