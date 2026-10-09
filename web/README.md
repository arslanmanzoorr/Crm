# EstateOS Web

Next.js 16 + Tailwind v4 app for EstateOS. Design tokens live in `src/app/globals.css` (see `../DESIGN.md`).

```bash
npm install
npm run dev    # http://localhost:3000
npm test       # helper unit tests
```

## Pages

| Route | What it does |
|---|---|
| `/` | Workspace: schedule, KPIs, new leads, day's tasks, call window with AI summary |
| `/leads`, `/leads/[id]` | Lead grid with search and score filters; profile with timeline, call/text/email links, **Analyze with AI** |
| `/properties`, `/properties/[id]` | Listings; jump to Studio or Publish for a listing |
| `/inbox` | Unified threads (SMS, WhatsApp, email, Instagram) with an **AI draft** reply |
| `/studio` | Photos → Ken Burns listing video (9:16, 1:1, 16:9), rendered in the browser, downloads as MP4/WebM |
| `/publish` | AI captions per platform, publish now or schedule through n8n |

Data lives in Supabase (Postgres + Auth). Without the Supabase env vars the app runs on the mock data in `src/lib/data.ts`, read-only and without login (local only; production refuses to start without them).

## Database

Migrations are in `supabase/migrations/`, applied in order:

| File | What |
|---|---|
| `0001_init.sql` | Orgs, memberships, contacts, properties, activities; RLS per org; org created on sign-up |
| `0002_tasks.sql` | Tasks; AI next action on contacts |
| `0003_security.sql` | Helper functions moved out of the REST API, size limits, FK indexes, audit log, AI usage metering |
| `0004_same_org_fks.sql` | Child rows can only point at a contact in the same org |
| `0005_search_scale.sql` | Trigram lead search, `last_activity_at`, list indexes |
| `0006_listing_photos.sql` | Private `listing-photos` bucket, org-folder storage policies, `property_media` |
| `0007_lead_forms.sql` | Public lead forms, `submit_lead()` with rate limits and dedupe, speed-to-lead tasks |
| `0008_anon_lockdown.sql` | Signed-out visitors have no table access at all |
| `0009_teams.sql` | Active org per user, roles in policies, invites |
| `0010_form_rpc_key.sql` | `submit_lead()` only accepts calls carrying the server key |
| `0011_active_org_rpc.sql` | `active_org()`, idempotent `accept_invite()` |
| `0012_routing_tags_response.sql` | Round-robin routing, tags, first-response time |
| `0013_form_leads_unowned.sql` | Form leads start unassigned, then routing decides |
| `0014_erase_on_delete.sql` | Deleting a lead also wipes their details from the audit log (right to delete) |
| `0015_open_houses.sql` | Open houses, public QR sign-in (`submit_checkin`, keyed), visitor feedback; task assignees must be teammates |
| `0016_deals.sql` | Deals with milestone checklists and commission terms; erase-on-delete covers deals |
| `0017_offers.sql` | Offers (both sides) with negotiation history; erase-on-delete covers offers |
| `0018_analytics.sql` | `team_analytics()`: sources, response time, cycle, revenue, forecast, agents, listing funnel (security invoker, RLS-scoped) |
| `0019_retention.sql` | Referrals (`referred_by`), review requests per deal, testimonials with publish consent, team review link |
| `0020_showings.sql` | Showings (booking, status, buyer feedback) and listing showing instructions |
| `0021_analytics_showings.sql` | Listing funnel counts showings |
| `0022_financing_partners.sql` | Partner directory and per-buyer financing (lender, loan stage, preapproval, documents) |
| `0023_client_portal.sql` | Client portal: hashed link tokens, `portal_view` / `portal_message` / `portal_favorite`, listing seller |
| `0024_workflows.sql` | Automation playbooks: trigger enrollment, conditions, stop stages, pg_cron runner with retries |
| `0025_workflow_task_window.sql` | Automated tasks are due 15 minutes after creation |
| `0026_territories.sql` | Territories (area → agent), checked before round-robin routing |
| `0027_buying_signals.sql` | `buying_signals()`: re-engaged, portal saves, liked at showings, open-house touring, newly preapproved |
| `0028_cmas.sql` | Saved CMAs: subject, agent-entered comps, adjustment rates, net sheet inputs |
| `0029_relationships.sql` | Contact relationships (household, family, friend, colleague), one row per pair |
| `0030_finance.sql` | Expenses (per deal / lead source), commission payout approval (guarded), per-agent default split (`set_default_split`) |
| `0031_analytics_spend.sql` | Lead sources include marketing spend for cost per lead / per closing |
| `0032_listing_history.sql` | Listing history (status and price changes, by trigger) and listing agreement expiry |
| `0033_documents.sql` | Documents bucket (private, 25 MB, allowlisted types, team-folder policies) and documents table |
| `0034_suppressions.sql` | Team do-not-contact list; matching leads (existing and future) are marked DNC by triggers |

After `0010`, store the hash of your form key (per environment):

```sql
insert into private.app_secrets values ('form_rpc', '<sha256 hex of FORM_RPC_KEY>');
```

Every table has row-level security: a user only ever sees rows of orgs they belong to. Every server action re-checks the session as well.

## Environment (`web/.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SITE_URL=https://app.yourdomain.com          # used for auth email links; never taken from request headers
ANTHROPIC_API_KEY=sk-ant-...                  # AI features (model claude-opus-5-5)
AI_DAILY_LIMIT=200                            # AI calls per org per 24h (default 200)
FORM_IP_SALT=<random 32+ bytes hex>           # salts visitor IP hashes on public lead forms
FORM_RPC_KEY=<random 32+ bytes hex>           # server-only key for submit_lead (DB stores its SHA-256)
N8N_PUBLISH_WEBHOOK_URL=https://your-n8n/webhook/estateos-publish   # Publish button
```

In Supabase → Authentication: set **Site URL** to `SITE_URL`, add `SITE_URL/auth/callback` to the redirect allow-list, and turn on **leaked password protection**.

## Security

- Row-level security on every table, plus same-org foreign keys
- Session checked in the proxy and again inside every server action
- Security headers (CSP, HSTS, frame-ancestors none, nosniff, referrer and permissions policy) in `next.config.ts`
- `/api/*` returns 401 when signed out; AI requests are size-capped and metered per org
- Audit log of every create/update/delete on contacts, listings and tasks

### n8n publish payload

`POST` to the webhook with JSON:

```json
{
  "property": { "id": "p1", "address": "14 Oak Ave", "price": 635000, "...": "..." },
  "posts": [{ "platform": "Instagram", "caption": "..." }],
  "scheduledAt": "2026-10-10T09:00" 
}
```

`scheduledAt` is `null` for "publish now". Branch on `platform` in n8n and call each network's API, or an aggregator such as Ayrshare.
