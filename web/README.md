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

Every table has row-level security: a user only ever sees rows of orgs they belong to. Every server action re-checks the session as well.

## Environment (`web/.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SITE_URL=https://app.yourdomain.com          # used for auth email links; never taken from request headers
ANTHROPIC_API_KEY=sk-ant-...                  # AI features (model claude-opus-5-5)
AI_DAILY_LIMIT=200                            # AI calls per org per 24h (default 200)
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
