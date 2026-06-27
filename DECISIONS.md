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
