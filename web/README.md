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

Data is mocked in `src/lib/data.ts`. Swap it for Supabase next.

## Environment (`web/.env.local`)

```bash
ANTHROPIC_API_KEY=sk-ant-...                                     # AI features (/api/ai, model claude-opus-5-5)
N8N_PUBLISH_WEBHOOK_URL=https://your-n8n/webhook/estateos-publish   # Publish button
```

Without these the app still runs. The AI and Publish buttons then show what to set.

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
