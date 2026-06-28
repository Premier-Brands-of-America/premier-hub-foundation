# DECISIONS — feat/premier-hub-revamp

## Context (inferred 2026-06-27 00:45:58 EDT)
- **Stack:** Vite + React + TypeScript + Tailwind + shadcn/ui; Supabase (Postgres + RLS + Edge Functions/Deno); React Query; React Hook Form + Zod. Test: Vitest.
- **Auth:** Microsoft Entra SSO via Supabase; preview/mock login locally. RLS throughout.
- **Brand:** Premier-crimson (#c10230), Space Grotesk + Inter, dark/light tokens. Contract in DESIGN_LANGUAGE.md.
- **Base branch:** feat/v2 (per owner override), NOT main.
- **Entities present:** standalone Projects, standalone Tasks, Art Department Requests (portal). Services in src/services, hooks in src/hooks.
- **Approach:** Build Planner/Kanban functional layer (buckets, comments/@mentions, notifications, due-date justification, routing matrix) ON TOP of existing entities with minimal disruption; redesign Graph to enterprise grade.

## Reviewability strategy (6/27/2026, 12:50:39 AM)
- Local review runs `npm run dev` with **mock/preview auth** → no Supabase JWT → RLS-gated data is empty.
- Cannot push DB migrations (deploy step; safety: no infra). So:
  - New features ship as **real** migrations + services + hooks + UI + Vitest tests (correctness proven without a live DB).
  - A **preview-demo data path** populates the NEW surfaces (Kanban board, Planner dashboard, redesigned Graph, comments/gallery demos) in preview mode so the owner can see & click them.
  - Pure logic (routing matrix, Art Lead CC rule, @mention parse, due-date urgency, Outlook prefill) is fully unit-tested.
  - Live-data runtime (against real Supabase) requires the documented deploy: `supabase db push` + edge-fn deploy. Logged in BLOCKERS.md.
- **Kanban DnD:** use native HTML5 drag-and-drop (no new dep) — keeps deps minimal.
- **Charts:** recharts (already a dependency).
- **Surgical:** shared capability components are added and wired into existing Project/Task/Art-Request detail panels; existing services/routes preserved.

## Art Lead CC + ownership matrix (6/27/2026, 12:50:39 AM)
- Ownership matrix stored as config data (src/config/artOwnership.ts), seedable/editable later — not inline conditionals.
- Art Lead identity is config/env: VITE_ART_LEAD_EMAIL (documented; real value supplied by owner). CC rule: CC art lead by default, except when assigned manager IS the art lead.
- Multi-owner customers (owned by >1 manager, detected generically) → required manager selector at request time.

## Phase 3 council (6/27/2026, 1:19:47 AM)
- Ran a 7-lens multi-agent design council (Workflow). Its strict structured-output
  synthesis exceeded the schema retry cap; to keep the unattended run moving, the
  per-lens reports + decision were authored from the same code inspection.
  Artifacts: docs/design-review/agent-01..07 + decision.md.
- Selected direction: "refined v2 enterprise" — consolidate on the v2 token system,
  keep restraint + subtle motion, invest polish in legibility (Graph done; charts +
  keyboard a11y are logged nice-to-haves). Rejected: flashy/3D, palette swap, adding
  a DnD library, bespoke chart lib.
- Phase 4 applied: token-based Graph edges + node polish (already), Kanban dragging
  visual state. Remaining nice-to-haves logged.

## Auth model — M365-only (Feature 4, verified 2026-06-27 2:15pm EDT)
Verified that Microsoft Entra OAuth is the ONLY real authentication path.
- **Production** (lovable.app, `import.meta.env.DEV === false`): the app mounts
  `AuthProvider` + `Login` (App.tsx lines 140/187). `AuthContext` exposes exactly one
  sign-in: `signInWithMicrosoft()` → `supabase.auth.signInWithOAuth({ provider: "azure" })`.
  The Entra authorize URL for the Outlook/Graph connection is built server-side in the
  `ms-oauth-start` edge fn (HMAC-signed state) and never exposed in the client bundle.
- **Preview/dev only** (`isPreviewEnvironment()` — Vite dev, localhost, *.lovableproject.com,
  Tailscale `.ts.net`/`100.x`): mounts `PreviewAuthProvider` + `PreviewLogin` with mock
  user cards. `signInWithMicrosoft()` is a no-op there. This path is unreachable in prod
  because `import.meta.env.DEV` is false and the host is `lovable.app`.
- **No alternative auth exists.** Grep across `src/` for `signInWithPassword`,
  `signInWithOtp`, `signUp`, `resetPasswordForEmail`, `magicLink` → zero matches. The
  Supabase client is a vanilla `createClient` with default session storage; no custom
  providers. User rows are created only by the `handle_new_user` trigger on
  `auth.users` INSERT (extracts `azure_oid` from OIDC metadata); `profiles` RLS forbids
  direct inserts. No code change required — verification + documentation only.
- **Infra follow-up (owner):** keep the Supabase Auth provider settings locked to
  Azure only (do not enable email/password or magic-link in the Supabase console).
  Logged in BLOCKERS.md.

## Project documents vs attachments (Feature 3, 2026-06-27)
The owner's brief explicitly asked for a `project_documents` table + `project-documents`
Storage bucket with rich metadata (uploader + date + type icons + size). A lightweight
`project_attachments` table/bucket already existed. Rather than silently re-interpret the
spec onto the existing table, we built the requested dedicated **Documents** surface
(richer metadata, multi-file upload, preview/download) and left the existing minimal
**Attachments** list intact. Both appear in the project detail panel; the owner can
consolidate later if desired. Preview keeps documents working with inline data-URLs.

## Per-user colors persistence (Feature 2, 2026-06-27)
Chose to nest `color_overrides` inside the existing `profiles.preferences` JSONB rather
than add a separate `user_theme_prefs` table: it reuses the established preferences
read/write path + RLS (owner updates own row), avoiding duplicate policies. localStorage
mirrors it for instant apply + the preview path.

## v2 final polish — Sidebar IA, Audit Log, Reports, Profile Integrations (2026-06-28)

### Diagnostics gating ("admin + diagnostics")
There is no "diagnostics" **role** — the Role union is only admin/designer/requester.
Diagnostics capability is the boolean `profile.can_view_diagnostics` (or `is_admin`).
So "Audit Log visible to admin + diagnostics" = `is_admin || can_view_diagnostics`.
- `ProtectedRoute` gained `allowDiagnostics` — a user passes if their role matches
  `requireRole` OR (`allowDiagnostics` && `can_view_diagnostics`). `/audit` uses
  `requireRole="admin" allowDiagnostics`. `/admin/settings` stays `requireRole="admin"`.
- `NavItem` gained `requireDiagnostics` for sidebar parity with the route guard.
- The Administration sidebar group now renders for `is_admin || can_view_diagnostics`
  (was admin-only); per-item visibility lives in NavItem (Audit Log = admin+diagnostics,
  everything else admin-only). Verified against the three preview mock users
  (Standard Employee, Diagnostics User, Admin User) in PreviewAuthContext.

### Audit Log is APP-WIDE (not request-only)
The Audit Log records actions across every area — projects, tasks, pages, art requests,
auth, and admin (feature-flag/role/department/permission changes). In preview a seeded
cross-app demo feed (`demoAuditStore`) renders it. Production reads `public.audit_log`
(RLS: admins see all) via `useAuditLog`, joined to the actor profile. NOTE: production
rows are sparser than the demo shape — `area` is **inferred** from `entity_type`, and the
human action label is derived from the `action` column. Enriching production rows (an
explicit `area` column + structured before/after rendering) is a follow-up.

### Reports data sources
Reports is driven by a pure metrics module (`reportsMetrics`) over a normalized
`ReportItem[]`. In preview the dataset spans the art-request demo store (`demoListAll`)
**and** the planner demo board (`demoBoard` — tasks + projects), so charts span the app.
`by_department` uses requests only (planner cards carry no department). In production
`useReportData` reads the `requests` table; folding live projects/tasks into Reports
(a unified server view) is deferred. Per-user chart selection persists to localStorage
in preview (`reportPrefs`); production should nest it under `profiles.preferences->'report_charts'`.
