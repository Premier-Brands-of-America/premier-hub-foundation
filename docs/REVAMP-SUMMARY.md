# Premier Hub — Functional + Design Revamp Summary

Branch: **`feat/premier-hub-revamp`** (built on top of `feat/v2`; `main` untouched,
nothing deployed). Stack unchanged: Vite + React + TS + Tailwind + shadcn/ui +
Supabase + React Query + RHF/Zod; Vitest.

## Before → after (by area)

| Area | Before (v2) | After (this revamp) |
|---|---|---|
| **Work model** | Standalone Projects, personal Tasks, Art Requests — list views only | **Planner/Kanban**: Project → Buckets → Tasks board with drag-and-drop, Planner-style cards, and a Board/Insights toggle |
| **Due dates** | Plain "Due MMM d" text | Prominent **color-coded urgency badge** (overdue=red, ≤3d=amber, else neutral) across Tasks, Projects, Requests, and cards |
| **Due justification** | none | Structured **reason + type (Meeting/Launch/Deadline/Other) + linked event**, required when a date is set, shown next to the date |
| **Comments** | flat notes | **Threaded comments with @mentions** (highlighted; mention → notification trigger) |
| **Attachments** | filename lists | **Image thumbnail gallery** + lightbox (click-to-view), non-image files as a compact list |
| **Notifications** | basic in-app table | **Trigger builders** for assignment/comment/mention/status/due (in-app + email payloads), with dedupe; enriched `notifications` schema |
| **Art Request routing** | manual | **Customer → owning manager** auto-routing (lead assignment), **multi-owner selector** (Master Dielines), **Art-Lead CC** rule (no double-CC), key points, meeting toggle |
| **Meetings** | none | **"Meet to discuss"** flag + **Schedule in Outlook** (Graph event payload + deeplink fallback) |
| **Dashboard** | editable card grid | **Planner-style charts** (status, due-health, by bucket/priority/assignee) — live, data-driven |
| **Graph** | functional but flat | **Enterprise redesign**: token-based edges, node halo/selection glow, label pills, hi-DPI, redesigned legend (counts + relation styles), polished empty/loading states, live stats |

## Functional features delivered (Phase 1 checklist)

- [x] Kanban model **Project → Buckets → Tasks** (create/rename/reorder buckets; move cards)
- [x] Shared **comments + @mentions** (component + trigger logic; tested)
- [x] **In-app + email** notification **triggers** (assignment/comment/mention/status/due) — *dispatch wires at deploy; needs `Mail.Send` for email — see BLOCKERS*
- [x] **Image gallery** thumbnails with click-to-view
- [x] **Prominent, color-coded due date** + **structured justification**
- [x] **Art Request**: requestor images, key points, key info (metadata), status workflow, IDs
- [x] **Customer→manager routing** with auto project-lead, **multi-owner selector**, config-driven **Art-Lead CC**
- [x] **Meeting toggle** + **Schedule in Outlook** (persisted flag + scheduler action)
- [x] **Graph calendar event creation** built on M365 integration (`calendar-create-event` edge fn) — *runtime needs `Calendars.ReadWrite`; deeplink works now — see `docs/GRAPH-PERMISSIONS.md`*
- [x] **Planner-style dashboard** with live charts
- [x] Migrations for all of the above (`20260627120000_planner_kanban.sql`) — *applied at deploy*

## Design direction

Internal ops tool → **clarity, density, accessibility over spectacle**; serious
enterprise restraint; subtle, performance-safe motion only. Reuses the v2 token
system (Premier-crimson `#c10230`, Space Grotesk + Inter, dark/light tokens —
`DESIGN_LANGUAGE.md`). New components consume semantic tokens (`hsl(var(--…))`)
so re-theming stays centralized. Phase 3 multi-lens **design council** reports +
synthesized decision live in `docs/design-review/`.

### How to tweak later
- **Colors/typography/spacing:** `src/index.css` tokens + `tailwind.config.ts`.
- **Ownership matrix / emails:** `src/config/artOwnership.ts` (+ DB `art_ownership`).
- **Due-soon window, urgency tones:** `src/lib/dueDate.ts`, `components/common/DueDateBadge.tsx`.
- **Demo/seed board:** `src/features/planner/demoData.ts`.

## Tests
56 Vitest unit tests (routing + CC rule, due-date urgency/justification, @mention
parse/insert, notification triggers, Outlook prefill, Kanban board ops, planner
metrics). `npx tsc --noEmit` clean; `npm run build` clean (chunk-size advisory only).

## Blockers / trade-offs
See **`BLOCKERS.md`** — chiefly: DB migration + edge-fn deploy deferred (no infra
access), Graph `Calendars.ReadWrite` / `Mail.Send` scopes are Entra admin actions,
and the new feature surfaces use a **preview-demo data path** for local review
since mock login has no RLS session. All decisions logged in **`DECISIONS.md`**.

## Remaining TODOs
- Apply the migration + regenerate `types.ts`; swap the planner demo store for the
  Supabase-backed loader.
- Grant the Graph scopes; wire "Schedule in Outlook" to `calendar-create-event`.
- Implement notification dispatch (insert in-app rows server-side + send email).
- Optional a11y polish from the council (see `docs/design-review/decision.md`).
