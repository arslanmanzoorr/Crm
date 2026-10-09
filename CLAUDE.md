# EstateOS: working notes for Claude

## Start of every session
1. Read `docs/STATUS.md` (what's built, what's next) before planning. The full backlog is `docs/FEATURES.md`.
2. For questions about how the code fits together, use the knowledge graph before reading files:
   `graphify query "<question>"` (graph lives in `graphify-out/`, local only, gitignored).
   If `graphify-out/graph.json` is missing or older than the last commits, run `/graphify . --update` first.
3. Next.js 16 with breaking changes: read `web/AGENTS.md` and the docs in `web/node_modules/next/dist/docs/` before writing Next code.

## How this project is built
- App: `web/` (Next.js 16, React 19, Tailwind v4). Data: Supabase project **PropertyOS** (ref `bwmaynntonlemlafzlcw`).
- Every schema change is a numbered file in `web/supabase/migrations/` AND applied to the project; run the Supabase security advisor after DDL.
- Security model: every policy is scoped to the user's *active org* (`private.my_org()`); anonymous visitors have no table access, only `submit_lead` (server key) and `lead_form_info`.
- Server actions in `web/src/lib/actions.ts` re-check the session (`authed()`); reads go through `web/src/lib/db.ts`.
- Tests: `cd web && npm test` (node:test). Gate before every commit: test, lint, `npx tsc --noEmit`, build.

## Quality bar (from the owner)
- Built like a 100-person team: thoughtful, secure, mobile-first, no AI slop.
- Audit UI before showing it (impeccable detector + desktop and phone check). Lead reports with what's still wrong.
- Verify features in a real browser (Playwright headless works when the app pane is hidden).
- Local test logins are in `web/.env.local` (TEST_LOGIN, TEST_LOGIN_2); delete them from auth.users before launch.
