# Regression Audit — Premier Project Hub v2 (`feat/v2`)

Read-only regression review. Date: 2026-06-26. Merge-base with `main`: `cd03a98`.

## Verdict

No functional regressions found. The v2 redesign is **purely presentational** with respect to
routing, services, and hooks: the route table, all core workflow services, and the core hooks are
byte-identical to `main`. Type-check, production build, and the (placeholder) test suite all pass.
The only red signal is `npm run lint` (68 errors) — but those are overwhelmingly pre-existing
`no-explicit-any`/`prefer-const` findings and Deno edge-function noise, not gating CI today and not
introduced by the redesign. Details and the two real (low-severity, pre-existing) items below.

## Command results

| Check | Command | Result |
|---|---|---|
| Type-check | `npx tsc --noEmit` | **PASS** — exit 0, zero errors |
| Build | `npm run build` | **PASS** — exit 0, built in ~4.4s |
| Lint | `npm run lint` | **FAIL** — 68 errors, 15 warnings (see L1) |
| Tests | `npx vitest run` | **PASS** — 1/1, but only a placeholder test exists (see L2) |

Build emits a chunk-size warning: `dist/assets/index-*.js` is 858 kB (253 kB gzip). Informational,
pre-existing (code-splitting already in place via `lazy()` for routes); not a regression.

## Routes — VERIFIED INTACT

`src/App.tsx` route block (lines 145–176) is **byte-for-byte identical** to `main`
(`git show cd03a98:src/App.tsx`). All 28 routes present; every `lazy()` import target resolves to
an existing file (checked all 28 page modules). Role guards and `FeatureRoute` feature gates
unchanged. No route lost or renamed in the redesign.

## Workflow services / hooks — VERIFIED INTACT

`git diff cd03a98..feat/v2` on the projects↔tasks↔pages + art-request critical paths:

| File | Diff vs main |
|---|---|
| `src/services/requests.ts` | unchanged |
| `src/services/taskService.ts` | unchanged |
| `src/services/projectService.ts` | unchanged |
| `src/services/pagesService.ts` | unchanged |
| `src/services/relationsService.ts` | **+55 (additive only)** — new `resolveEntities()` export for `[[ ]]` wikilink rendering; no existing fn altered. Compiles; preview-guarded. Sound. |
| `src/hooks/use-task-detail.ts` | unchanged |
| `src/hooks/use-project-detail.ts` | unchanged |
| `src/hooks/use-page.ts` | unchanged |
| `src/hooks/useRequests.ts` | unchanged |
| `src/hooks/use-relations.ts` | unchanged |
| `src/hooks/use-queries.ts` | unchanged |

The redesign touched component/presentation files (`ProjectDetailPanel.tsx`, `TaskDetailPanel.tsx`,
`AppSidebar.tsx`, `EmployeeTable.tsx`, `Settings.tsx`) but not the data layer. `DesignModeProvider`
exports (`theme/setTheme/toggleTheme/density/setDensity` via `useDesignMode`) match all consumers
(`AppLayout`, `ProfilePage`, `ui/sonner`); tsc confirms.

## Migrations — VERIFIED SOUND & ORDERED

Ordering by timestamp prefix is correct and dependency-safe:

- `20260601110000_ms_oauth_calendar.sql` creates `public.ms_connections` (+ `calendar_events`).
- `20260601120000_teams_transcripts.sql` (graph_subscriptions / meeting_transcripts /
  transcript_segments) runs **after**, and references `projects`/`pages` (from earlier migrations).
  `ms_connections` correctly precedes the teams tables.
- `20260602100000_fix_requests_insert_rls.sql` — art-request INSERT RLS fix present and sound:
  drops the old policy by name (idempotent) and recreates it as
  `with check (requester_id = auth.uid())` (file lines 18–22). Matches the known/intended fix:
  a user may submit for any department but only attributed to themselves.

Parenthesis balance check on the four newest migrations: all balanced (11/11, 38/38, 50/50, 8/8).

## Known fixes — RE-VERIFIED SOUND

- **art-request INSERT RLS** → `requests` policy `with check (requester_id = auth.uid())`. Sound.
- **preview feature flags** → `FeatureFlagsProvider.tsx:78-84` enables `ALL_FEATURE_KEYS` only in
  `isPreviewEnvironment()`; production still resolves real flags. Sound.
- **graph d3 force-tuning guard** → `GraphCanvas.tsx:119` `if (!fg || typeof fg.d3Force !== "function") return;`
  guards the force calls before the engine is ready. Sound.
- **page-editor reset keyed on pageId** → `PageEditor.tsx:46-52` `setValue(initialContent)` runs only
  on `[pageId]` change (not on every `initialContent`), preventing the fast-typing data-loss
  (commit 22c7ad1); flush-on-unmount (`:76`) preserves edits. Sound.
- **ms-oauth open-redirect allowlist** → noted as fixed; not re-inspected in this dimension.
- **ai-assistant / transcribe-summarize env-driven AI** → noted as fixed; not re-inspected here.

## window.prompt / window.confirm — NONE REINTRODUCED

`rg` over `src/` for `window.prompt|window.confirm|prompt(|confirm(`: the only native dialog is
`src/components/attachments/AttachmentList.tsx:73` `if (!confirm(...)) return;`. **This is
pre-existing on `main`** (`cd03a98` has the identical line) and the redesign did **not** touch this
file — so it is NOT a reintroduction. Recorded below as a pre-existing low-severity item. No
`window.alert` in `src/`. 8 files use the proper `AlertDialog` replacement.

---

## Findings

### L1 — `npm run lint` fails (68 errors) — pre-existing noise, not a redesign regression — LOW
**Location:** repo-wide; e.g. `supabase/functions/ai-assistant/index.ts` (28× `no-explicit-any`),
`src/services/projectService.ts:17,19,20` & `src/services/pagesService.ts:8` (`prefer-const`),
`src/components/projects/ProjectDetailPanel.tsx` / `tasks/TaskDetailPanel.tsx` (`no-explicit-any`),
`tailwind.config.ts:134-135` (`no-require-imports`).
**Detail:** Verified the 3 service files with `prefer-const` errors are unchanged vs `main` (zero
diff) — pre-existing. `eslint.config.js` lints the Deno `supabase/functions/**` tree (only `dist`
is ignored), so 30+ errors come from edge functions that never run through this lint in practice.
The redesign-touched components do contain `as any` casts (e.g. `AppSidebar.tsx:147,150` nav-gating
casts), but these are functional and pre-date / mirror existing patterns. tsc and build both pass,
so none of these block compilation. Lint is not currently wired as a hard gate.
**Recommendation:** Don't block the redesign on this. Separately: scope eslint to ignore
`supabase/functions/**` (Deno, different toolchain), and address the `as any` casts and `prefer-const`
in a dedicated cleanup pass. Treat lint as non-blocking until the baseline is green.

### L2 — No meaningful automated test coverage — LOW
**Location:** `src/test/example.test.ts` (the only test file).
**Detail:** `vitest` passes but runs a single placeholder test. There is no behavioral coverage for
the projects↔tasks↔pages or art-request workflows, so a future regression in those flows would not
be caught by CI. This is not introduced by the redesign, but it is the reason the "tests pass"
signal carries little weight for this audit.
**Recommendation:** Add smoke tests for `ProtectedRoute`/`FeatureRoute` gating and at least one
render test per critical workflow page before relying on the suite as a regression gate.

### L3 — Pre-existing native `confirm()` in attachment delete — LOW
**Location:** `src/components/attachments/AttachmentList.tsx:73`.
**Detail:** Uses the browser-native `confirm()` for delete confirmation. Verified present on `main`
at the same line and untouched by the redesign — so NOT a reintroduction. Flagged only for
consistency: the rest of the app uses Radix `AlertDialog` for confirmations, and native `confirm()`
is style-inconsistent and blocks the main thread.
**Recommendation:** Out of scope for the v2 redesign sign-off. In a later pass, replace with the
existing `AlertDialog` pattern for visual/UX consistency.
