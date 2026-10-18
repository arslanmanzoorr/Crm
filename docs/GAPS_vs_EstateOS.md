# Market pain points vs EstateOS (18 Oct 2026)

This checks the "real estate CRM feature gaps" research against what EstateOS already does.
Key: **Have** = built and working. **Partial** = a smaller version exists. **Missing** = not built.
**Needs account** = can't go live until an outside service (Twilio, email, etc.) is connected.

| # | Pain point | EstateOS today | Status | Smallest next step |
|---|---|---|---|---|
| 1 | Leads wait hours for a reply | Website chat answers 24/7 from your listings. New leads get a "call within 5 minutes" task, and AI drafts the first reply | Partial | **Instant first reply**: an opt-in, consent-checked first text/email sent within 60s, with a log of what was sent and why. The email version works now via Gmail; text needs Twilio |
| 2 | Texting/calling paywalled, group texts, phone texts not logged | Call/text buttons check consent and calling hours. Voice notes and logging exist. No SMS provider yet | Needs account | Twilio: A2P 10DLC registration, group/MMS, every message logged. Include it in the price instead of selling it as an add-on |
| 3 | Agents don't own their data, exports capped | CSV export per table. RLS keeps each team's data separate | Partial | **"Download everything"**: one zip with every lead, note, message, task, deal and document, unlimited history, any time. No competitor offers it, and it takes about a day to build |
| 4 | Hidden prices, contracts, setup fees | n/a (how we sell) | Business | Publish prices on /welcome: month-to-month, no setup fee, export anytime |
| 5 | Setup is too hard | One-click playbooks store, CSV import, business card scan | Partial | Onboarding tour + quests (planned). Add a **setup checklist** that turns on routing, the form and a playbook in 3 clicks |
| 6 | Deal data typed twice; lead CRM stops at contract | Deals, milestones, offers, document room, coordinator links and templates are built in, so there's nothing to re-type | Have (core) | **AI contract reader**: upload the purchase agreement PDF and AI fills the close date, deadlines and milestones (agent confirms). Dotloop/SkySlope sync later (needs accounts) |
| 7 | No ROI by lead source or by agent | Analytics shows source → close, conversion by agent, campaigns, cohorts and earnings by month | Partial | Add **spend per source** (agent types the monthly cost) to get cost per lead, per appointment and per closing, plus return on spend |
| 8 | Past clients forgotten | Past clients page, anniversaries, home value updates, review asks, Keep in touch on Today, linked people | Have | Family dates (kids' birthdays, wedding anniversary) on the person, plus "send to both spouses" |
| 9 | Leads go missing silently | Speed-to-lead task, overdue flags on Today | Partial | **Lead watchdog**: alert when a lead passes 5/15/60 minutes with no contact, a daily self-test of each public form, and a weekly "response time" report |
| 10 | Mobile apps weak in the field | Mobile-first web, bottom nav, voice notes, mic search | Partial | Installable app (PWA) + **voice commands**: "log this showing, follow up Friday, text the buyer" becomes structured actions the agent confirms |
| 11 | Per-seat pricing punishes assistants | Assistant role exists | Business | Free assistant seats; price per agent, not per login |

## Recommended order (impact ÷ effort, no outside accounts needed first)
1. **Download everything** (gap 3): a day of work and the strongest marketing line right now, given the Zillow/FUB data story and brokerage mergers.
2. **Lead watchdog + response-time report** (gaps 9, 1): uses data we already store. Proves "no lead slips" to brokers.
3. **Instant first reply by email** (gap 1): opt-in, consent-checked and logged. Text follows once Twilio is connected.
4. **Spend per source → ROI** (gap 7): small addition to Analytics.
5. **AI contract reader → deal timeline** (gap 6): replaces part of a $300–500 per file coordinator.
6. **Voice commands + installable app** (gap 10).
7. Onboarding tour and setup checklist (gap 5), already planned in PLAN_onboarding_tour.md.
8. Twilio texting/calling (gap 2) once the account is set up.

Business moves (4, 11), no code: public month-to-month pricing, no setup fee, free assistant seats, "export anytime" promise.
