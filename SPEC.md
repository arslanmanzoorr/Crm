# EstateOS: AI-Powered Real Estate CRM, Product & Technical Spec

> Working name: **EstateOS**. Rename freely.
> Status: Draft v0.1 · 2026-10-08

---

## 1. Vision

A CRM for real estate agents, teams and brokerages where AI does the busywork:
it qualifies leads, writes and sends follow-ups, makes listing marketing (video,
posts, copy), and tells the agent **who to call today and what to say**.

**Positioning:** existing CRMs (Follow Up Boss, Lofty, kvCORE, Real Geeks) are
databases with AI features added on. EstateOS is built around AI from the start:
the CRM is the memory, and AI agents do the work, with a human approving each step.

### Target users
| Segment | Needs | Plan |
|---|---|---|
| Solo agent | Speed, marketing content, never miss a follow-up | Solo |
| Team (2–20) | Lead routing, shared pipeline, accountability | Team |
| Brokerage (20+) | Multi-office, compliance, branding, reporting | Brokerage |
| Developers / property managers | Bulk listings, project launches, tenant leads | Enterprise |

---

## 2. Core Modules (MVP scope)

### 2.1 Contacts, Leads & Pipeline (foundation)
- Contacts: buyers, sellers, renters, landlords, investors, vendors (lenders, inspectors).
- Lead sources: website forms, Zillow/Realtor.com/Facebook Lead Ads, portals,
  CSV import, email parsing, WhatsApp, inbound calls.
- Pipelines (configurable): `New → Contacted → Qualified → Showing → Offer → Under Contract → Closed / Lost`.
- Properties linked to contacts: interested in, saved, toured, owns, selling.
- Deduping and enrichment (phone, email, social, property ownership where legal).
- Tasks, reminders, notes, a timeline of every touchpoint.

### 2.2 AI Customer Analysis ⭐
For each contact, AI builds and keeps updating a **Client Intelligence Profile**:

| Output | How |
|---|---|
| **Lead score (0–100)** + "why" | Behavioral signals: listing views, email opens, reply speed, saved searches, pre-approval status, timeline stated |
| **Intent & timeline** | "Buying in 0–3 months", "just browsing", "investor" |
| **Stated preferences** | Budget, areas, beds/baths, must-haves, dealbreakers, extracted from calls, emails and chats |
| **Sentiment & urgency** | Per conversation, with a trend line |
| **Personality / communication style** | "Prefers text, short messages, responds evenings" |
| **Next best action** | "Send 3 new matches in Westside under $650k; call Thursday 6pm" |
| **Churn risk** | Going cold, or likely talking to another agent |
| **Conversation summary** | Rolling summary across all channels |

**Daily "Who to call today" brief:** a ranked list with talking points, sent at 8am by
email, push or WhatsApp.

> ⚠️ **Fair Housing guardrail (mandatory):** scoring, matching and recommendations
> must **never** use or infer protected classes (race, color, religion, sex,
> disability, familial status, national origin, plus state/local classes). AI must
> never steer clients toward or away from neighborhoods based on demographics.
> Build a policy layer that strips these attributes and checks outputs for steering language.

### 2.3 AI Property Video Generator ⭐
Turn listing photos into a ready-to-post video.

**Pipeline:**
```
Upload photos (10–40)
  → AI classifies rooms (kitchen, living, exterior…) and picks the best shots
  → Optional: AI enhance (sky replacement, lighting, declutter, virtual staging)
  → Image-to-video per shot (slow pan/dolly/parallax, 3–5s each)
  → AI script from listing data → AI voiceover (agent's cloned voice or a stock voice)
  → Music, captions, price/address overlays, agent branding, CTA end card
  → Render outputs: 9:16 (Reels/TikTok/Shorts), 16:9 (YouTube/MLS), 1:1 (feed)
```

**Templates:** Luxury, Just Listed, Open House, Price Drop, Just Sold, Neighborhood Tour.

**Avatar mode (v2):** the agent's AI avatar presents the property on camera.

> ⚠️ **Compliance:** virtually staged or altered images and video must carry a
> visible "Virtually Staged / AI-Enhanced" label (MLS rules; e.g. California AB 723
> since Jan 2026). Keep the originals and auto-watermark the altered frames.

### 2.4 One-Click Multi-Platform Publishing ⭐
- Platforms: Instagram (Reels, Feed, Stories), Facebook (Page + Marketplace where
  allowed), TikTok, YouTube Shorts, LinkedIn, X, Google Business Profile, Pinterest,
  WhatsApp Status/Channels, plus property portals and MLS syndication where APIs allow.
- AI writes **platform-specific captions** (length, hashtags, tone), first comments
  and alt text.
- Content calendar, scheduling, best-time-to-post recommendations, approval workflow
  for brokerages.
- Unified analytics: views, engagement, leads generated per post.
- **Engagement to lead:** comments and DMs like "price?" or "still available?" are
  captured and turned into CRM leads with an AI auto-reply.

### 2.5 Calling & Email (Unified Communications) ⭐
**Calling**
- Click-to-call from the browser and mobile (VoIP), local numbers, call forwarding.
- Call recording (with consent prompts) → transcription → AI summary → CRM notes
  and tasks created automatically.
- Live call copilot: real-time prompts, objection handling, property facts on screen.
- Power dialer for lead lists.
- **AI Voice Agent:** answers missed and after-hours calls, qualifies the caller
  (budget, area, timeline, pre-approval), books showings on the agent's calendar,
  and hands off hot leads to a human immediately.

**Email & messaging**
- Two-way Gmail/Outlook sync, plus SMS, WhatsApp, Instagram/Facebook DMs in **one inbox**.
- AI drafts replies in the agent's own voice. Modes: suggest / auto-send with approval / full auto.
- Drip campaigns and smart nurture: AI writes each message personalized to the
  profile instead of using a fixed template.
- Bulk campaigns: new listings, market reports, newsletters.

> ⚠️ **Compliance:** TCPA (US calls/SMS consent, quiet hours, DNC scrubbing), A2P 10DLC
> SMS registration, CAN-SPAM/GDPR unsubscribe, call-recording consent laws
> (two-party states), and disclosure when the caller is an AI.

---

## 3. Futuristic Features (Roadmap, researched)

Grouped by how soon they could realistically ship.

### 🟢 Near-term (v1.5, 3–6 months after MVP)
1. **Smart Property Matching Agent:** watches new listings 24/7, matches them to each
   buyer's profile, and sends "I found 3 homes you'll love" with a short explanation of why each one fits.
2. **AI CMA & Valuation:** comparative market analysis in 60 seconds, a branded PDF,
   and a price-recommendation range with confidence.
3. **AI Listing Copy Studio:** MLS description, feature bullets, brochure and flyer,
   with a Fair-Housing-safe language check.
4. **Virtual Staging & Renovation Preview:** "show this kitchen modernized" for
   buyers or flippers, labeled as AI-generated.
5. **Meeting/Showing Notes via mobile:** agent records a voice memo after a showing;
   AI updates the profile ("loved the yard, hated the street noise").
6. **WhatsApp AI Concierge:** a 24/7 assistant on WhatsApp for international and
   Gulf/South Asian markets, where WhatsApp is the main channel.
7. **Ask-your-CRM chat:** "Which sellers in Oakwood haven't heard from me in 60 days?"
   answers in natural language with actions attached.

### 🟡 Mid-term (v2, 6–12 months)
8. **Predictive Seller Intelligence:** ranks the agent's sphere and farm area
   by likelihood to sell in the next 6–12 months (equity, tenure, life-event
   signals, engagement with home-value emails). *Uses only legally sourced and
   consented data.*
9. **Autonomous Follow-up Agent:** a multi-step agent that runs the whole nurture
   on its own (text → email → call → re-engage) with guardrails and escalation rules.
10. **Transaction Copilot:** reads contracts and disclosures, extracts deadlines
    (inspection, appraisal, financing, closing), builds the timeline, chases
    parties, and flags risky clauses.
11. **AI Avatar Videos:** the agent's digital twin records personalized video messages
    ("Hi Sarah, here's the home I mentioned…") at scale.
12. **Neighborhood Intelligence Reports:** schools, commute, amenities, price
    trends and development plans in one AI report (no demographic steering).
13. **Market Pulse Content Autopilot:** weekly local market update posts and
    videos generated automatically from MLS data.
14. **Open House Kiosk:** QR or tablet sign-in → instant lead → AI follow-up within 5 minutes.

### 🔴 Long-term / Moonshots (v3+)
15. **AI Negotiation Assistant:** simulates the counterparty, suggests offer
    strategy and counter-offer ranges based on comps and days on market.
16. **3D / Gaussian-Splat Tours from phone video:** walk through the home in the
    browser or a VR headset, generated from a 2-minute phone walkthrough.
17. **Voice-first CRM:** the agent drives while talking ("log that call, text
    Mike the new listing, schedule a showing Saturday").
18. **Investor Copilot:** rental yield, cash-flow, cap-rate and renovation-ROI
    forecasts for each property, with portfolio tracking for investor clients.
19. **Agent Marketplace / Referral AI:** matches out-of-area leads to partner
    agents automatically, with referral fee tracking.
20. **Blockchain / smart-contract escrow hooks:** tokenized deposits and title
    integrations where jurisdictions allow (speculative, watch the market).
21. **Digital Twin of the Business:** "If I spend $2k more on Facebook ads, how
    many closings next quarter?" Forecasting based on the agent's own funnel.

---

## 4. Suggested Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui** | Fast, SEO for public listing pages |
| Mobile | **React Native / Expo** | Agents live on their phones |
| Backend / DB | **Supabase** (Postgres, Auth, Storage, Realtime, Edge Functions, `pgvector`) | One platform; row-level security for multi-tenant |
| Hosting | **Vercel** (web) + Supabase | Simple deploys |
| Automation / Orchestration | **n8n** (self-hosted) | Workflows for lead intake, drips, posting, render jobs; non-devs can edit them |
| Job queue | Supabase Queues / Inngest / Trigger.dev | Long jobs such as video rendering and bulk sends |
| LLM | **Claude** (Opus for analysis/agents, Haiku for high-volume classification & replies) | Reasoning, tool use, long context for conversation history |
| Embeddings / Search | pgvector | Semantic property matching and "ask your CRM" |
| Image-to-Video | Kling / Google Veo / Runway / Luma (provider-abstracted) | Pick per cost and quality; swap as models improve |
| Video compositing | **Remotion** or FFmpeg | Templates, captions, overlays, branding |
| Virtual staging | Virtual Staging AI API or an in-house diffusion model | |
| Voice / TTS | ElevenLabs (voice cloning) | Voiceovers and the voice agent |
| Telephony | **Twilio** (voice, SMS, WhatsApp) | Numbers, recording, A2P |
| Voice agent | Vapi / Retell / Twilio + Claude realtime pipeline | After-hours AI receptionist |
| Email | Gmail & Microsoft Graph APIs (sync), Resend/SendGrid (bulk) | |
| Social publishing | Direct APIs (Meta Graph, TikTok, YouTube, LinkedIn) or an aggregator (Ayrshare / Late / Upload-Post) for faster MVP | Aggregator first, direct APIs later to cut cost |
| Listings data | MLS via RESO Web API / IDX providers (Bridge, Spark, SimplyRETS), local portals | |
| Payments | Stripe (subscriptions + usage credits for video/AI minutes) | |
| Analytics | PostHog | |

### High-level architecture
```
             ┌──────────────┐     ┌──────────────┐
  Web/Mobile │  Next.js /   │────▶│   Supabase   │◀── RLS multi-tenant
             │  Expo apps   │     │ Postgres+Vec │
             └──────┬───────┘     └──────┬───────┘
                    │ API / Edge Fns     │ DB webhooks
                    ▼                    ▼
             ┌─────────────────────────────────┐
             │   AI Orchestrator (agents)      │──▶ Claude API (tools: CRM read/write,
             │   + n8n workflows + job queue   │      send msg, book slot, search listings)
             └──┬──────┬──────┬──────┬────────┘
                │      │      │      │
           Twilio  Gmail/  Social  Video pipeline
           (voice, Outlook  APIs   (img→video, TTS,
            SMS,WA)                 Remotion render → Storage/CDN)
```

---

## 5. Data Model (core tables)

```
organizations(id, name, plan, branding, settings)
users(id, org_id, role[owner|admin|agent|assistant], phone, voice_clone_id)
contacts(id, org_id, owner_id, type[buyer|seller|renter|investor|vendor],
         name, emails[], phones[], source, stage, consent_sms, consent_call,
         consent_email, dnc, tags[], created_at)
contact_profiles(contact_id, lead_score, score_reasons jsonb, intent, timeline,
         budget_min, budget_max, preferences jsonb, sentiment, comm_style,
         next_best_action, summary, embedding vector, updated_at)
properties(id, org_id, mls_id, address, geo, price, beds, baths, sqft, status,
         features jsonb, description, embedding vector)
property_media(id, property_id, url, kind[photo|video|staged], room_type,
         quality_score, is_ai_altered)
contact_properties(contact_id, property_id, relation[saved|viewed|toured|owns|selling], score)
deals(id, org_id, contact_id, property_id, pipeline_id, stage, value,
         commission, key_dates jsonb)
activities(id, org_id, contact_id, user_id, channel[call|sms|email|wa|dm|note|showing],
         direction, content, transcript, ai_summary, sentiment, recording_url, ts)
tasks(id, org_id, assignee_id, contact_id, deal_id, title, due_at, status, created_by[user|ai])
campaigns(id, org_id, type[drip|blast|ai_nurture], steps jsonb, status)
video_jobs(id, org_id, property_id, template, status, inputs jsonb, outputs jsonb, cost)
social_accounts(id, org_id, platform, tokens_encrypted, page_id)
social_posts(id, org_id, video_job_id, platform, caption, scheduled_at,
         status, external_id, metrics jsonb)
ai_actions(id, org_id, agent, contact_id, action, payload, status[proposed|approved|executed|rejected], approved_by)
audit_log(id, org_id, actor, action, entity, before, after, ts)
```
`ai_actions` is the key table. Every AI-proposed action goes through it, which
gives approval queues, undo and full auditability.

---

## 6. AI Agent Design

| Agent | Trigger | Tools | Autonomy default |
|---|---|---|---|
| **Analyst** | New activity on a contact | read timeline, update profile/score | Full auto |
| **Inbox Responder** | Inbound message | read profile, search listings, draft reply, book showing | Draft → approve |
| **Follow-up Agent** | Schedule / stale lead | send SMS/email, create task | Approve first N, then auto |
| **Matcher** | New listing / profile change | vector search, send matches | Approve |
| **Voice Receptionist** | Missed / after-hours call | qualify, book, transfer | Full auto (with disclosure) |
| **Content Agent** | New listing / status change | generate video, captions, schedule posts | Draft → approve |
| **Daily Briefer** | 8am cron | ranking, summaries | Full auto |

**Guardrails:** Fair Housing filter, consent/quiet-hours check before any outbound
message, spend caps per org, PII redaction in logs, a human-takeover keyword, and
prompt-injection hardening on inbound messages (inbound text is treated as data, never as instructions).

---

## 7. Key n8n Workflows (MVP)
1. **Lead intake:** Webhook (form / FB Lead Ads / Zillow email parse) → dedupe →
   create contact → Analyst agent → speed-to-lead SMS within 60s → notify agent.
2. **Listing launch:** New listing → Content Agent → video render → captions →
   approval → publish to all platforms → log post IDs.
3. **Call wrap-up:** Twilio recording webhook → transcribe → summarize → update
   profile → create tasks.
4. **Daily brief:** Cron → rank contacts → generate brief → email/WhatsApp.
5. **Social engagement capture:** comment/DM webhook → intent classify → create
   lead → AI reply.
6. **Nurture loop:** stale-lead detector → Follow-up Agent → approval queue.

---

## 8. Monetization
| Plan | Price (indicative) | Includes |
|---|---|---|
| Solo | $79/mo | 1 user, 2k contacts, 10 AI videos/mo, unified inbox, AI drafts |
| Team | $299/mo (5 users) + $49/user | Routing, voice agent, shared pipeline, 40 videos |
| Brokerage | Custom | Multi-office, compliance, SSO, white-label |
| **Usage credits** | Pay-as-you-go | Extra videos, AI voice minutes, avatar videos, SMS |

Video generation and voice minutes have real per-unit costs, so meter them with
credits from day one.

---

## 9. MVP Plan (≈12–14 weeks)

| Phase | Weeks | Deliverables |
|---|---|---|
| **0. Foundations** | 1–2 | Auth, multi-tenant orgs, RLS, contacts, properties, pipeline UI |
| **1. Comms** | 3–5 | Gmail/Outlook sync, Twilio click-to-call + SMS, unified inbox, call transcription & summaries |
| **2. AI Analysis** | 5–7 | Client profiles, lead scoring, next best action, daily brief, AI reply drafts |
| **3. Video** | 7–10 | Photo upload → room classification → img-to-video → voiceover → Remotion templates → 3 aspect ratios |
| **4. Publishing** | 10–12 | Social account connect, AI captions, schedule/publish, basic analytics |
| **5. Polish & Beta** | 12–14 | Billing/credits, onboarding, compliance checks, 10–20 beta agents |

**Post-MVP first picks:** AI Voice Receptionist, Smart Property Matching, AI CMA.

---

## 10. Success Metrics
- Speed-to-lead: median under 60 seconds
- % of AI drafts sent without edits (quality proxy): target >60%
- Videos generated per listing; posts published per week per agent
- Lead → appointment conversion uplift vs. the agent's baseline
- Weekly active agents / retention at 90 days
- AI cost per active seat (keep under 25% of the plan price)

---

## 11. Risks & Open Questions
- **MLS/IDX access** varies by region and needs broker approval. Decide the launch market first (US? UAE? Pakistan? UK?).
- **Social API limits:** TikTok and Instagram publishing require app review. Start with an aggregator.
- **Video cost and latency:** image-to-video costs dollars per clip. Cache aggressively and offer a cheaper "Ken Burns" fallback mode.
- **Regulatory:** Fair Housing, TCPA, GDPR, AI disclosure laws, AI-image disclosure. Budget for legal review.
- **Open questions:**
  1. Launch geography and which portals/MLS to integrate first?
  2. Solo agents first, or brokerages first? (This changes the sales motion.)
  3. Should brand voice cloning and avatars be in v1 for differentiation?
  4. Build our own social publishing, or use an aggregator?
