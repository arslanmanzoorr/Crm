# EstateOS Design System

> Visual direction: **dark "Workspace" UI with a lime accent**. Pill controls, soft
> rounded cards, and large thin numerals. Taken from a reference CRM UI kit that is
> used as *inspiration only*. We build our own components; we don't copy the kit's assets.

---

## 1. Design Tokens

### Color
| Token | Value | Use |
|---|---|---|
| `--bg` | `#0E0E0E` | App background |
| `--surface-1` | `#1A1A1A` | Panels, sidebars |
| `--surface-2` | `#262626` | Cards |
| `--surface-3` | `#333333` | Icon buttons, chips, hover |
| `--surface-light` | `#EDEDED` | Inverted cards (AI Summary panel, active pill) |
| `--text` | `#F5F5F5` | Primary text |
| `--text-muted` | `#9A9A9A` | Secondary text, labels |
| `--text-on-light` | `#111111` | Text on light/lime surfaces |
| `--accent` | `#C5F36A` | Lime: primary CTA, highlighted task, key numbers, timeline |
| `--accent-strong` | `#A9E33F` | Accent hover/pressed |
| `--border` | `rgba(255,255,255,0.06)` | Hairline card borders |
| Score scale | `#F2766B` → `#F5A25D` → `#F5D35D` → `#C5F36A` → `#7BE07B` | 5-dot interest / lead-score meter |

Light mode is optional for v2. The dark theme is the main experience.

### Typography
- **Font:** `Urbanist` (Google Fonts). Fallback: `Outfit`, `Inter`, system-ui.
- Display numerals (KPIs like "34 Deals"): 40–48px, weight **300**, tight tracking.
- Section titles ("New Leads", "Your Day's Tasks"): 18–20px, weight 400, followed by a small muted count.
- Card name ("Jane Doe"): 18px / 500. Role line: 12px / 400 muted.
- Labels/chips: 12px / 500.

### Shape & Spacing
- Card radius **24px**. Pill radius **999px**. Avatars and icon buttons are fully circular.
- **Signature notch:** cards have an inverted cut-out in the top-right corner holding a
  circular `↗` action button. Build it with a CSS `mask` / SVG path (`<NotchCard>`).
- Spacing scale: 4 · 8 · 12 · 16 · 24 · 32 · 48.
- Shadows: almost none. Depth comes from surface steps, not drop shadows.

### Motion
- 150–200ms ease-out on hover and press. Cards lift 2px on hover and the `↗` button fills with lime.
- The timeline "now" marker slides; the AI Summary panel slides in from the right.

---

## 2. Component Inventory → CRM Features

| Component (from reference) | EstateOS usage |
|---|---|
| **Schedule timeline pill** (avatars on a lime track + "2:15 pm" marker) | Today's showings and calls bar in the header |
| **KPI numerals** ("34 Deals · 20 · 3 lost") | Active deals, showings this week, hot leads, closed |
| **Lead card** (avatar, name, role, Source chips, 5-dot interest, `↗`) | Lead card. The dots show the **AI lead score**; Source shows Zillow, FB Ads, Instagram… |
| **Filter pills** (`All` · `🔥 Hot` · `Due Today`) | Lead and task filters, driven by the AI score and due dates |
| **"+ New Task" pill + circular icon buttons** (video, mic, speaker) | Quick actions: New task, Video call, **Click-to-call**, Voice note |
| **Task card**, highlighted in lime ("Google Meet Call") | Next task, the AI's top-priority action |
| **Task card**, neutral ("Send Proposal") | Other tasks: send CMA, follow-up email, showing |
| **Floating video-call window** | In-app call/video with live transcription |
| **AI Summary panel** (light card: Documents, Goal) | **AI call summary**: key points, extracted preferences, attached docs (pre-approval, contract), next steps |
| **Documents tiles** | Property brochures, CMAs, contracts |
| **Goal card** | Client goal, e.g. "3-bed in Westside under $650k by March" |
| **Duration pill** ("36 min" + avatars) | Call log entry |
| **Left icon rail** | Nav: Dashboard · Leads · Properties · Inbox · Studio (video) · Publish · Settings |

New components needed for EstateOS features, built in the same style:
- **Property card:** cover image at 24px radius, price in a lime pill, beds/baths chips, `↗`.
- **Video Studio:** photo grid → template pills → preview player → aspect-ratio toggle (9:16 / 16:9 / 1:1).
- **Publish composer:** platform toggle pills (IG, TikTok, YT, FB, LinkedIn) with a caption preview for each.
- **Unified inbox:** thread list plus a chat pane, with an "AI draft" suggestion card in lime outline.
- **Daily brief card:** a ranked list of "Who to call today" with one-tap call buttons.

---

## 3. Main Screens
1. **Workspace (home):** schedule bar, KPIs, New Leads row, Your Day's Tasks row, AI Summary drawer.
2. **Lead profile:** header with score dots, AI profile (intent, budget, preferences), timeline, call/email/SMS buttons.
3. **Properties:** grid and map, property detail, "Make video" CTA.
4. **Studio:** AI video generator.
5. **Publish:** calendar and composer.
6. **Inbox:** unified messages and calls.

---

## 4. Implementation
- **Tailwind config:** map the tokens above to `colors`, `borderRadius` (`card: 24px`) and `fontFamily`.
- **shadcn/ui**, restyled: Button (pill variants: `accent`, `ghost`, `icon`), Badge (chip), Avatar, Sheet (AI Summary drawer), Tabs (filter pills).
- Custom: `NotchCard`, `ScoreDots`, `ScheduleTimeline`, `KpiStat`, `CallWindow`.
- Accessibility: lime on black passes contrast, but text on lime must use `--text-on-light`. Score dots also need a text/aria value (e.g. "Lead score 82, Hot"), never color alone.
