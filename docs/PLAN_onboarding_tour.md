# Plan: first-run walkthrough ("Learn EstateOS")

Goal: anyone opening EstateOS for the first time can take a short, fun tour or skip it, and can come back to it any time.
It should feel like a game you finish in two minutes, not a manual.

## What the user sees

1. **Welcome card** (first sign-in only, after the team's branding has loaded):
   "Welcome to {Team name}. Want a 2-minute tour?" → **Show me around** / **Skip, I'll explore**.
   Skipping is one click and never asks again. Both options say where to find the tour later.
2. **The tour**: about 8 short steps. Each step highlights one real part of the screen with a soft spotlight and a small card:
   step title, one or two lines, progress dots, **Back / Next**, and **Skip tour** always visible.
   On phones the card is a bottom sheet so it never covers the thing it points at.
3. **Getting-started quests**: a card on Today with 6–7 small real tasks. Each ticks itself off when you actually do it
   (detected from real data, nothing to tick by hand). Finishing all of them earns a short celebration
   (confetti, unless the person prefers reduced motion) and a "You're set up" badge on Account.
4. **Restart any time**: "Take the tour" in Account, in the command palette (⌘K → "tour"), and on the quests card.

### Tour steps (agent version)
| # | Where | Highlight | Message (draft) |
|---|---|---|---|
| 1 | Today | Header | "This is your day. Everything that needs you today lands here first." |
| 2 | Today | Who to call today | "Hottest and most overdue first. Tap Call and EstateOS logs it for you." |
| 3 | Today | Customize this page | "Make it yours: drag sections around or hide the ones you don't need." |
| 4 | Leads | Ask bar + score dots | "Ask in plain English: 'buyers in Westside nobody's called in 30 days'. Dots show how hot each lead is." |
| 5 | Lead page | AI next step + timeline | "AI suggests the next step and drafts the message. Nothing is sent until you send it." |
| 6 | Inbox | AI draft button | "Replies in the lead's language, using only your real listings." |
| 7 | Listings / Deals | Nav items | "Listings, showings and deals live here when you need them." |
| 8 | Search | ⌘K | "Lost? Press ⌘K (or /) and type anything." Then: "Want a practice lead to try it on?" |

- **Owner/admin add-on** (2 steps on Team): branding + modules, invite teammates.
- **Assistants** get the agent tour without the deal and money steps.
- Steps for modules the owner switched off are skipped automatically, and the copy uses the team's name.

### Quests (ideas; final list after a quick look at which actions matter most for retention)
- Add your first lead (or import a CSV)
- Log a call or note on a lead
- Generate an AI reply draft
- Add a listing
- Share your lead form link
- Turn on two-step sign-in
- Owners only: invite a teammate, set your logo and color

### Practice lead (optional, offered at the end of the tour)
- One clearly labelled sample lead ("Taylor Practice · sample") to try Call, AI draft and stage changes on.
- Fictional 555-01xx number and example.com email, no contact consent, so nothing can ever reach a real person.
- Left out of analytics and routing. One-click delete; it also deletes itself after 14 days.

## Making it fun (without being cringe)
- Short, warm copy in plain words. Light humour, never jokes about the user's job.
- Real motion: the spotlight glides between targets and the card springs in (Motion, already installed).
  With reduced motion turned on, everything appears instantly.
- Visible progress: dots plus "3 of 8". Quests show a ring that fills up.
- A small win at the end: confetti, a badge, and one suggested next action.
- No points tables, streaks, guilt messages or nagging. A skipped tour stays skipped.

## How it's built (minimal and in-house)
- **No new dependency.** A ~200-line `Tour` client component: highlight targets marked with `data-tour="..."`, measure them,
  draw the spotlight as a CSS clip-path cut-out, position the card next to them (bottom sheet under 640px).
  It moves to the next page with the router when a step lives elsewhere.
  Skipped alternative: driver.js; ours matches the team branding, both themes and the phone layout for less code.
- **Steps** live in one plain list in `lib/tour.ts`: `{ id, path, target, title, body, needs?: Feature, roles? }`.
  The same file filters steps by role and switched-off modules, with a unit test for that filter.
- **State** in `user_prefs.tour` (jsonb): `{ step, done_at, skipped_at }`. One migration.
  Quests are computed from real data (count of leads I created, notes I logged, and so on), so they need no extra state.
- **Accessibility**: the card is a labelled dialog. Focus moves to it and returns afterwards. Esc skips; ←/→ go back and forward.
  Progress is announced ("Step 2 of 8"). The page behind stays usable; the spotlight is visual only.
  Contrast is checked in light and dark.
- **Respects white-label**: team colour, button shape and light/dark apply automatically, because it uses the same tokens.

## Build order for tomorrow
1. Migration (`user_prefs.tour`), `lib/tour.ts` step list + role/module filter + tests.
2. `data-tour` markers on the ~10 target elements.
3. Tour component: welcome card, spotlight, step card, cross-page steps, skip/resume, keyboard, phone bottom sheet.
4. Restart entry points: Account, ⌘K, quests card.
5. Quests card on Today, with server-side progress and the finish celebration.
6. Practice lead (create, label, exclude from analytics, auto-delete).
7. Verify: fresh account sees the welcome card; skip persists; resume after reload; owner vs agent vs assistant;
   modules switched off; phone and desktop; light and dark; reduced motion; axe clean. Then docs, push.

## Questions for the owner (defaults in brackets, so work can start either way)
- Mascot or character, or keep it clean? [clean, no mascot]
- OK to offer the practice lead? [yes, labelled and auto-deleting]
- Should owners be able to switch the tour off for their whole team? [yes, a toggle under Modules]
