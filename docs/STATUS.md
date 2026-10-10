# Build status against FEATURES.md

Numbers refer to the feature list in [FEATURES.md](FEATURES.md).
**Done** = working and tested in the app. **Partial** = a real but smaller version exists.
**Needs account** = can't be built or tested until an outside service is connected (keys, app review, licenses).

Last updated: 2026-10-09.

| # | Module | Done | Partial | Needs account | Not started |
|---|---|---|---|---|---|
| 1 | AI Command Center | | 2, 5, 8, 10 | 9 (speech) | 1, 3, 4, 6, 7, 11, 12 |
| 2 | Lead Generation | 17, 20, 24, 25, 26 (Farming page: area market numbers, due-for-a-touch, market note), 28 (cold calls gated on a recorded Do Not Call Registry check, 31-day scrub window; texts stay consent-only), 30 | 18, 19, 21 | 13, 14, 15, 16, 22, 23, 27, 29 | |
| 3 | Lead Management | 31, 32, 35, 37, 39, 40, 41, 42, 43, 45, 46, 48 | 33, 34, 36, 38, 44 (territory then round-robin; performance-based not yet), 47 | | |
| 4 | Communication Hub | 67 | 59, 63 | 49, 50, 51, 53, 54, 55, 56, 57, 58, 60, 61, 64, 66 | 52, 62, 65 |
| 5 | Listings | 69, 70, 72, 73 (links), 74, 75, 76, 77, 78, 79, 80, 81, 82, 83 | | 68, 71 | |
| 6 | Matchmaking | 84, 85, 86, 91 (as tasks) | 90 (lead criteria act as the saved search) | 88 (maps) | 87, 89, 92–94 |
| 7 | Marketing Studio | 96, 99 (1080px social post per listing: just listed, open house, price improved, under contract, just sold), 105 + 106 (just listed / open house / just sold note per listing, sent to fitting buyers or area leads, logged per lead), 107, 108 (Farming market note) , 110 (Analytics: notes sent and reply rate per campaign) | 95, 97, 98, 103, 104 | 100, 101, 102 | 109 |
| 8 | Showings & Open Houses | 111, 113, 115, 116, 117, 118, 120, 121, 122 | 112 (.ics files, no two-way sync), 119 (follow-up task, not a draft yet) | 112 (two-way sync), 114 (route optimization needs maps) | |
| 9 | Deals & Transactions | 136 (team-private document room), 123, 124, 125, 128, 129, 130, 131, 132, 133, 134, 135 (in-app flags), 138, 139, 140 (handoff task + home added on close) | | 126 | 127, 137 |
| 10 | Seller Intelligence & CMA | 141, 142, 145, 146, 150, 151 | 152 (drafted on the listing page; agent sends) | 144, 149 (valuation and public-records feeds) | 143, 147, 148 (need market data) |
| 11 | Mortgage & Financing | 153, 154, 155, 156, 157, 158, 159, 161 | 162 (in-app warnings) | 160 | |
| 12 | Client Portal | 163, 164, 166, 167, 168, 170, 171, 172, 173, 174, 176 | 175 (agent sees portal activity; no client notifications yet) | 175 (email/SMS) | 165, 169 |
| 13 | Referral & Retention | 177, 178, 179, 180, 181, 182, 183, 185, 186 | | | 184 |
| 14 | Brokerage & Team Ops | 188, 189, 190, 193, 195 | 187, 191, 192, 194, 196 (territories; no offices) | | |
| 15 | Commissions & Finance | 198, 199, 201, 202, 203, 204, 206 | 197 (default split per agent; no caps or tiers), 200 (pending and 30-day view) | 205 | |
| 16 | Investor Toolkit | 207, 208, 209, 210, 211, 214, 215 (homes they own: equity, yield), 216 | 213 (portal hearts) | 212 (rent comps) | — |
| 17 | Automation & Workflows | 218, 219, 220, 222, 225, 226 | 217 (structured builder, not a canvas), 223, 224 | | 221 (needs AI key) |
| 18 | Analytics | 227, 228, 229, 230, 231, 232, 233, 234, 235 | 236 (CSV per table) | | |
| 19 | Security & Compliance | 237, 239, 240, 241, 242, 243, 244, 246 (secrets stay in host env; Account shows connected or not, never values), 248 | 245 | 238 (SSO) | 247 |
| 20 | Platform & Mobile | 260 (import) | 250 (responsive web) | 249, 251, 254, 255 | 252, 253, 256–259 |

## What "needs account" means in practice

| Service | Unlocks |
|---|---|
| OpenRouter API key (`OPENROUTER_API_KEY`) | All AI features (analysis, drafts, captions, Ask Your Business, agents) |
| Twilio (voice, SMS, WhatsApp) + A2P 10DLC registration | 49–55, 60, 61, 66 — the AI receptionist and "Every Lead Gets an Answer" |
| Google / Microsoft OAuth apps | 56, 112, 254, 255 (email and calendar sync) |
| Meta, Google Ads, TikTok developer apps (with app review) | 13–15, 29, 58 |
| MLS / IDX / RESO feed (broker approval per market) | 16, 68, 71, comps for CMA. For-sale portals (Zillow, Realtor.com, Redfin, Homes.com) only take listings from the MLS; each listing has a Marketplaces panel to track and check it |
| Zillow Rentals feed approval (free; rentalfeeds@zillow.com) | Rentals feed is built (`/feeds/zillow/<token>`, Team page); goes live on Zillow, Trulia, HotPads once Zillow approves the URL |
| E-signature (DocuSign / Dropbox Sign) | 126 |
| Social publishing (n8n webhook today; aggregator or direct APIs) | 103 at full strength |

## Build order (from the roadmap in FEATURES.md)

Items that need no outside account are built first, in roadmap phase order:

1. **Revenue engine:** ~~lead ownership, round-robin routing, response time, tags~~ (done), territories (43), ~~Instant Buyer Matching (84–86)~~ (done: listing page ranks buyers, lead page ranks listings, with reasons), ~~new-listing and price-drop alerts (91)~~ (done, as tasks for the buyer's owner), ~~showings and open-house check-in (111, 115–122)~~ (done).
2. **Closing engine:** ~~deals, milestones, deadline flags, commission splits~~ (done), ~~offers, comparison and negotiation history (123–125)~~ (done), Deal Rescue drafts once AI is connected.
3. **Growth and analytics:** ~~source, conversion, response, cycle, revenue, agent and listing analytics~~ (done; cost-per-lead 25 needs spend data), ~~past-client anniversaries and retention (177–186)~~ (done except partner directory 181 and neighborhood updates 184), broker views (190–192).
4. **Privacy rights:** ~~export, erase on delete, do-not-contact list, public request form with 45-day tracker~~ (done).
5. **Intelligence layer** once an OpenRouter key is connected: Ask Your Business, morning briefing, explainable scoring, Deal Rescue.
