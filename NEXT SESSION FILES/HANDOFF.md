# Premier Project Hub v2 — Session Handoff

**Written:** end of the build session. Resume in a fresh session with zero guesswork.
**Repo:** `premier-hub-foundation` · remote `Premier-Brands-of-America/premier-hub-foundation`
**Local repo root:** `/Users/edwinmejia/Developer/PremierHubv3/premier-hub-foundation`

---

## 1. WHERE WE ARE — the v2 build is COMPLETE and in a DRAFT PR

The full v2 was built, integrated, redesigned, bug-fixed, and audited. It lives on **`feat/v2`**
and is open as **draft PR #1**. `main` is untouched. Nothing is deployed yet.

- **Draft PR:** https://github.com/Premier-Brands-of-America/premier-hub-foundation/pull/1  (`feat/v2 → main`, **draft**)
- **`feat/v2` HEAD:** `af0d466` — **45 commits** ahead of `origin/main` (`cd03a98`), pushed to origin.
- **Verification:** `npx tsc --noEmit` ✅ · `npm run build` ✅ (only the pre-existing chunk-size advisory). In-browser smoke-test of ~18 routes = 0 console errors.

**The only substantial work remaining = DEPLOY to the real site** (§5). Everything else is optional polish (§6).

---

## 2. GIT STATE

| Branch | Last commit | Meaning |
|---|---|---|
| `main` | `cd03a98` | Untouched. Do NOT push here. |
| `feat/v2` | `af0d466` | **Integration branch** = the entire v2. Pushed to origin. PR #1 targets this → main. |
| `feat/design-system` + `feat/{dashboard,graph,pages,integ-outlook,integ-teams}` | various | P2/P3 build branches, all merged into `feat/v2`. Safe to leave or prune. |

**Worktrees** (siblings of the repo — all merged, prunable with `git worktree remove`):
`hub-design`, `hub-dash`, `hub-graph`, `hub-pages`, `hub-outlook`, `hub-teams`.

---

## 3. WHAT WAS BUILT (v2)

Phased agent-team build (P0 setup → P1 research → P2 design tokens → P3 features → P4 integrate
→ ground-up UI redesign → P5 art fix → P6 audit). Highlights:

- **Design system + shell** — one dark/light token system; **Premier-crimson** accent (`#c10230`,
  the logo red), **Space Grotesk** display + Inter, crimson "edge-rail" signature. Redesigned
  sidebar + structured header. Contract: **`DESIGN_LANGUAGE.md`** (repo root).
- **Editable dashboard** — drag/add/remove card grid; each card a saved view; per-user persistence
  (`dashboard_layouts`). `src/components/dashboard/`, `src/pages/Index.tsx`.
- **Graph** — Obsidian-style force graph (sliders, color by type+status, filters, local/global).
  `src/pages/Graph.tsx`, `src/components/graph/`.
- **Pages** — block editor with `/` slash menu, `[[ ]]` wikilinks + `@` mentions, Backlinks panel,
  linked-view embed, `/meet` blocks. `src/pages/Pages.tsx`, `src/components/pages/`.
- **Outlook** — MS-Graph OAuth foundation (`ms_connections`, `_shared/ms-graph.ts`,
  `ms-oauth-start/callback`), `calendar_events` + `calendar-sync`/`link-event-to-project`/`mail-search`,
  calendar panel on project pages + "This Week" dashboard card. Doc: `research/integrations-outlook.md`.
- **Teams** — transcript pipeline (`graph-subscribe`/`graph-renew`/`graph-webhook`/`transcribe-summarize`/
  `transcript-action-items`; tables `graph_subscriptions`/`meeting_transcripts`/`transcript_segments`),
  AI summary via the read-only assistant, action-items→tasks. Doc: `research/integrations.md`.
- **AI provider** — `ai-assistant` + `transcribe-summarize` are env-driven & OpenAI-compatible
  (`AI_GATEWAY_URL`/`AI_MODEL`/`AI_ASSISTANT_API_KEY`, default OpenAI `gpt-4o-mini`). No Lovable gateway.

**Premise preserved:** all 28 routes in `src/App.tsx` are byte-identical to `main`; projects↔tasks↔pages
+ art-request services/hooks unchanged; Entra SSO + RLS + read-only AI intact.

---

## 4. BUGS / SECURITY FIXED (found via in-browser testing + the P6 audit swarm)

1. **Art-request create** rejected by RLS (`department_id = current_department_id()`) → relaxed INSERT
   `WITH CHECK` to `requester_id = auth.uid()` (`20260602100000_*.sql`).
2. **Feature flags in preview** — mock login (null `auth.uid()`) made every gated route fail-closed →
   preview now enables all flags (`FeatureFlagsProvider`). *Production is unaffected: real Entra users
   default to flags ON.*
3. **Graph crash** — force-tuning called `d3VelocityDecay` before the ref was ready → readiness guard.
4. **Page editor data-loss** — save→refetch reset the editor mid-typing → reset now keys on `pageId` only.
5. **Open redirect** in `ms-oauth-callback` → `ALLOWED_APP_ORIGINS` allowlist (start + callback).
6. **P6 audit blockers:** (B1) `graph_subscriptions` exposed the `client_state` webhook secret to
   authenticated users → column-scoped grant; (B2) stale `index.html` pre-paint guard caused FOUC → now
   mirrors `DesignModeProvider`.

Audit reports: **`audit/SUMMARY.md`** + `audit/{security,design,usability,regression}.md`.

---

## 5. WHAT'S LEFT — DEPLOY TO THE REAL SITE (the main remaining task)

Full guide in **`KEYS_SETUP.md`**. The live site runs the OLD code until `feat/v2` is deployed.

1. **Merge / publish** PR #1 (or publish `feat/v2` from Lovable) → frontend redeploys.
2. **Migrations:** `supabase db push` (creates `dashboard_layouts`, MS-Graph/Teams tables, art-request RLS fix).
3. **Edge functions + secrets:** deploy functions; set secrets per `KEYS_SETUP.md`. **Use the PRODUCTION
   domain** for `MS_GRAPH_REDIRECT_URI` and the **new** `ALLOWED_APP_ORIGINS` (not `localhost:8080`), and
   register that callback URL in the Entra app. `verify_jwt` per function is in `supabase/config.toml`.
   `SUPABASE_SERVICE_ROLE_KEY` is auto-provided — do NOT set it.
4. **Cron:** register `graph-renew` (~12h) — SQL snippet in `KEYS_SETUP.md` / `research/integrations.md`.
5. **After** the env-driven `ai-assistant` is live & verified, **delete `LOVABLE_API_KEY`**.
6. Log in with **Microsoft Entra** on the real domain → all v2 features default on (no flag toggling).

**Infra already done** (prior session): Entra app has the Graph scopes (admin-consented) + the
`ms-oauth-callback` redirect URI; Teams application access policy `PremierHubTranscripts` granted;
most edge secrets set (`MS_GRAPH_*`, `TOKEN_ENCRYPTION_KEY`, `GRAPH_WEBHOOK_CLIENT_STATE`,
`AI_ASSISTANT_API_KEY`=OpenAI). **Still to set:** `ALLOWED_APP_ORIGINS` (new), and prod-domain values.

---

## 6. NON-BLOCKING BACKLOG (optional polish — see `audit/SUMMARY.md`)

- **A11y (medium):** request/create forms hand-roll error text — not announced/associated, focus not
  moved on failure. Migrate to the accessible shadcn `Form` primitive.
- **Design drift:** `timeline/CalendarView.tsx` + `EventBar.tsx` use `text-white` over light category
  fills (dark-mode contrast); selected-table-row rail uses neutral `--accent` instead of crimson; graph
  link colors hardcoded `rgba(120,120,120,…)` rather than a token.
- **Minor:** route announcer under-covers routes; Dashboard/⌘K "create" actions navigate instead of
  opening the modal; Graph desktop zero-node empty state; sidebar `nav` not a labeled landmark.
- **Hygiene:** root `.env` is git-tracked (public `VITE_` values only) — optional `git rm --cached .env`.
  `npm run lint` has 68 **pre-existing** errors (zero diff vs `main`), not a CI gate.

---

## 7. RUN / TEST LOCALLY

```bash
cd /Users/edwinmejia/Developer/PremierHubv3/premier-hub-foundation
npm run dev          # Vite on http://localhost:8080
npx tsc --noEmit && npm run build   # verify
```
- **Dev login** (`/login` on localhost) shows **mock test profiles** (Standard / Admin / Diagnostics) —
  no real Supabase session. In preview, all feature flags are force-enabled so every screen is reachable.
- To see Pages features: New page → type `/` (slash menu), `[[` (wikilinks); Backlinks panel on the right.
- Outlook/Teams show "Connect"/empty states locally — they need the deployed edge functions + real OAuth.

---

## 8. KEY FILES

- `DESIGN_LANGUAGE.md` — the visual contract (palette, type, spacing, signature).
- `KEYS_SETUP.md` — every credential + the deploy steps.
- `research/findings.md` — the build spec (feature research, per-area UX patterns, integration design).
- `research/integrations.md` (Teams) + `research/integrations-outlook.md` (Outlook) — edge fns, secrets, lifecycle.
- `audit/SUMMARY.md` + `audit/*.md` — P6 audit.
- `supabase/migrations/` — all new tables + the art-request RLS fix. `supabase/functions/` — edge functions.

---

## 9. GOTCHAS

- **Preview vs production flags:** `is_feature_enabled` returns `false` when `auth.uid()` is null (mock),
  else `coalesce(global, true)`. So preview needed the provider override; production needs nothing.
- **Editor ownership:** `PageEditor` resets only on `pageId` change (don't re-add `initialContent` to that
  effect's deps — that caused the data-loss bug).
- **Frozen-at-build files** (now LEAD-owned): `src/index.css`, `tailwind.config.ts`, `AppLayout.tsx`,
  `AppSidebar.tsx`, `App.tsx`.
- Edge functions are Deno (not in the client `tsc`/build); `npm run lint` flags them — ignore.
