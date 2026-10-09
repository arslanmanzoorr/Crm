# Build status against FEATURES.md

Numbers refer to the feature list in [FEATURES.md](FEATURES.md).
**Done** = working and tested in the app. **Partial** = a real but smaller version exists.
**Needs account** = can't be built or tested until an outside service is connected (keys, app review, licenses).

Last updated: 2026-10-09.

| # | Module | Done | Partial | Needs account | Not started |
|---|---|---|---|---|---|
| 1 | AI Command Center | | 2, 5, 8, 10 | 9 (speech) | 1, 3, 4, 6, 7, 11, 12 |
| 2 | Lead Generation | 17, 30 | 18, 19, 21, 24 | 13, 14, 15, 16, 22, 23, 27, 29 | 20, 25, 26, 28 |
| 3 | Lead Management | 32, 39, 40, 42, 45 | 33, 34, 36, 44 (round-robin; performance-based not yet), 46 (captured per lead; reports pending), 47 | | 31, 35, 37, 38, 41, 43, 48 |
| 4 | Communication Hub | 67 | 59, 63 | 49, 50, 51, 53, 54, 55, 56, 57, 58, 60, 61, 64, 66 | 52, 62, 65 |
| 5 | Listings | 69, 70, 72 | | 68, 71 | 73–83 |
| 6 | Matchmaking | 84, 85, 86, 91 (as tasks) | 90 (lead criteria act as the saved search) | 88 (maps) | 87, 89, 92–94 |
| 7 | Marketing Studio | 96 | 95, 97, 98, 103, 104 | 100, 101, 102 | 99, 105–110 |
| 8 | Showings & Open Houses | | 117, 118 | 112 | 111, 113–116, 119–122 |
| 9 | Deals & Transactions | | | 126 | 123–125, 127–140 |
| 10 | Seller Intelligence & CMA | | | 144, 149 | 141–143, 145–148, 150–152 |
| 11 | Mortgage & Financing | | | 160 | 153–159, 161, 162 |
| 12 | Client Portal | | | | 163–176 |
| 13 | Referral & Retention | | 180 | | 177–179, 181–186 |
| 14 | Brokerage & Team Ops | 188 | 187, 194 | | 189–193, 195, 196 |
| 15 | Commissions & Finance | | | 205 | 197–204, 206 |
| 16 | Investor Toolkit | | | | 207–216 |
| 17 | Automation & Workflows | | 223, 224 | | 217–222, 225, 226 |
| 18 | Analytics | | | | 227–236 |
| 19 | Security & Compliance | 237, 239, 240, 241, 244 | 242, 243 (export + erase on delete; no self-serve request form), 245, 248 | 238 (SSO) | 246, 247 |
| 20 | Platform & Mobile | 260 (import) | 250 (responsive web) | 249, 251, 254, 255 | 252, 253, 256–259 |

## What "needs account" means in practice

| Service | Unlocks |
|---|---|
| Anthropic API key | All AI features (analysis, drafts, captions, Ask Your Business, agents) |
| Twilio (voice, SMS, WhatsApp) + A2P 10DLC registration | 49–55, 60, 61, 66 — the AI receptionist and "Every Lead Gets an Answer" |
| Google / Microsoft OAuth apps | 56, 112, 254, 255 (email and calendar sync) |
| Meta, Google Ads, TikTok developer apps (with app review) | 13–15, 29, 58 |
| MLS / IDX / RESO feed (broker approval per market) | 16, 68, 71, comps for CMA |
| E-signature (DocuSign / Dropbox Sign) | 126 |
| Social publishing (n8n webhook today; aggregator or direct APIs) | 103 at full strength |

## Build order (from the roadmap in FEATURES.md)

Items that need no outside account are built first, in roadmap phase order:

1. **Revenue engine:** ~~lead ownership, round-robin routing, response time, tags~~ (done), territories (43), ~~Instant Buyer Matching (84–86)~~ (done: listing page ranks buyers, lead page ranks listings, with reasons), ~~new-listing and price-drop alerts (91)~~ (done, as tasks for the buyer's owner), showings and open-house check-in (111, 116–121).
2. **Closing engine:** deals, offers and transaction milestones with deadlines (123–125, 128–135, 138, 139), commission splits (197–200, 206).
3. **Growth and analytics:** source and conversion analytics (24, 25, 228–230), past-client anniversaries and retention (177–186), broker views (190–192).
4. **Privacy rights:** ~~data export~~ (done: Account → Export team data), ~~per-person deletion~~ (done: deleting a lead erases its audit copies) (243), which the Terms and Privacy Policy will reference.
5. **Intelligence layer** once an Anthropic key is connected: Ask Your Business, morning briefing, explainable scoring, Deal Rescue.
