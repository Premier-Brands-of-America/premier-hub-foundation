# P6 Audit — feat/v2 (triage summary)

Read-only swarm: **security · design · usability · regression**. Full per-dimension reports
alongside this file (`security.md`, `design.md`, `usability.md`, `regression.md`).

## Verdict
The v2 redesign is **functionally sound and compiles clean** (`tsc --noEmit` and `npm run build`
both exit 0; the redesign is purely presentational — all 28 routes in `App.tsx` are byte-identical
to `main`, and the projects↔tasks↔pages + art-request services/hooks are unchanged). Two real
issues warranted a fix before merge (**both now fixed**); everything else is non-blocking polish.
All six previously-known fixes (art-request RLS, preview flags, graph d3 readiness guard,
page-editor reset key, ms-oauth redirect allowlist, env-driven AI) were spot-checked and are sound.

## Blockers — FIXED
- **B1 (security, high) — `client_state` webhook secret readable by any authenticated user.**
  `graph_subscriptions` granted full-column `SELECT` to `authenticated`, exposing the shared
  `client_state` that authenticates the public `graph-webhook` endpoint (forgeable cross-user
  pipeline trigger). **Fix:** column-scoped the grant to exclude `client_state` (mirrors
  `ms_connections`) — `20260601120000_teams_transcripts.sql`. The client never reads this table.
- **B2 (design) — stale `index.html` pre-paint guard caused FOUC.** It set `data-design="classic"`
  (disabling the entire `[data-design="modern"]` component layer) and never set `.dark`, flashing
  unstyled/light content on every cold load. **Fix:** the guard now sets `data-design="modern"`,
  density, and `.dark`/`color-scheme` from the persisted `theme` (or OS preference), matching
  `DesignModeProvider`.

## Non-blocking backlog
**Security/hygiene**
- Root `.env` is git-tracked (contains only public `VITE_` values; real secrets in
  `supabase/functions/.env` are correctly ignored). Optional: `git rm --cached .env`.
- Follow-up: per-subscription random `client_state` so one leak can't impersonate others.

**Design**
- `timeline/CalendarView.tsx` + `EventBar.tsx`: `text-white` over light category fills → dark-mode contrast.
- Selected-table-row rail uses neutral `--accent` instead of the contract's crimson.
- `GraphCanvas` link colors are hardcoded `rgba(120,120,120,…)` rather than a token.

**Usability / a11y**
- (medium) Forms hand-roll error text and bypass the accessible Form primitive — field errors
  aren't announced/associated and focus isn't moved on failure.
- (low) Route announcer under-covers some routes; Dashboard/palette "create" actions navigate
  instead of opening the modal; Graph has no desktop zero-node empty state; sidebar `nav` isn't a
  labeled landmark.

**Regression**
- `npm run lint` fails with 68 **pre-existing** errors (no-explicit-any/prefer-const + Deno
  edge-function noise) — zero diff vs `main`, not a CI gate today.
- One native `confirm()` in `AttachmentList.tsx:73` is pre-existing on `main` (not reintroduced).
