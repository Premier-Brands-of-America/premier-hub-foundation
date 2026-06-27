# Premier Hub Revamp — Reviewer Guide

Everything here is reviewable **locally, with no push or deploy**.

## How to open it

```bash
cd /Users/edwinmejia/Developer/PremierHubv3/premier-hub-foundation
./start-review.sh
```

- The script starts the Vite dev server **detached** (survives the shell) on
  **port 8080**, bound to all interfaces.
- Open the printed URL:
  - Over Tailscale: **http://mac-studio.taildde06a.ts.net:8080**
  - Local: **http://localhost:8080**
- **Login:** at `/login` choose a **mock test profile** (Standard / Admin /
  Diagnostics). No real Supabase session is created; all feature flags are
  force-enabled in preview, so every screen is reachable.
- **Stop:** `kill $(cat .run/server.pid)` — or re-run `./start-review.sh` to
  restart. If the machine sleeps, just re-run the same one command.

### Data note (important)
Mock login has no Supabase JWT, so RLS-gated lists (existing Projects/Tasks/
Requests) appear **empty** locally — that's expected. The **new** Planner/Kanban,
the dashboard charts, and the redesigned Graph are populated from a **preview
demo dataset** so they're fully clickable without a database. Live data against
real Supabase requires the documented deploy (`supabase db push` + edge-fn
deploy) — see `BLOCKERS.md`. The demo board includes one Art Request per manager
(Jaclyn/Megan/Dan) plus the multi-owner **Master Dielines** case.

---

## What to inspect (each is a concrete pass/fail check)

### Kanban model — `/planner`  → `src/features/planner/*`, `src/pages/Planner.tsx`
- [ ] Board shows buckets **Intake / In Progress / Approved** with cards. *(`demoData.ts`)*
- [ ] **Add bucket** (right edge) → type a name → it appears. *(`KanbanBoard.tsx`)*
- [ ] Bucket menu (⋯) → **Rename**, **Move left/right**, **Delete bucket**. *(`KanbanColumn.tsx`)*
- [ ] **Drag a card** to another bucket — it moves and positions re-pack. *(`plannerBoard.ts moveCard`)*
- [ ] **Add card** in a bucket → opens as "Untitled". *(`KanbanColumn.tsx`)*

### Shared capabilities — open any card on `/planner` → `CardDetailDialog.tsx` + `src/components/common/*`
Test these on a **Task** card and an **Art Request** card (the demo has both):
- [ ] **Comment** with an **@mention** (type `@`, pick a user) → mention is
      highlighted; a dev-console line confirms who would be notified.
      *(`CommentsThread.tsx`, `lib/mentions.ts`, `lib/notificationTriggers.ts`)*
- [ ] **Attachment gallery**: images render as **thumbnails**; click opens a
      lightbox. *(`AttachmentGallery.tsx`)*
- [ ] **Due date**: set a date → a prominent, **color-coded** badge appears
      (overdue = red, ≤3 days = amber, else neutral). *(`DueDateBadge.tsx`, `lib/dueDate.ts`)*
- [ ] **Due-date justification** (required when a date is set): reason + type
      (Meeting/Launch/Deadline/Other) + linked event, shown next to the date.
      *(`DueDateJustificationField.tsx`)*
- [ ] **Checklist** add/tick with progress bar; **status / priority / assignee**.
- [ ] **Meet to discuss** toggle → **Schedule in Outlook** opens a pre-filled
      Outlook compose deeplink. *(`MeetingScheduler.tsx`, `lib/outlookPrefill.ts`)*

These same capabilities also appear on existing surfaces:
- [ ] Task & Project lists show the color-coded **DueDateBadge**.
      *(`tasks/TaskListItem.tsx`, `projects/ProjectListItem.tsx`)*
- [ ] Art Request detail shows a **Request summary** (customer→lead, key points,
      meeting flag) + due badge. *(`portal/RequestDetail.tsx`)*

### Art Request specifics & routing — `/requests/new` → Easy → step 1 "Basics"
→ `src/components/request-form/ArtRequestRouting.tsx`, `lib/artRouting.ts`, `config/artOwnership.ts`
- [ ] Pick **Kroger** → "**Jaclyn** becomes project lead" + "Alert to … · CC Art
      Lead" preview. *(single-owner auto-route)*
- [ ] Pick **Master Dielines** → a **required manager selector** appears; until
      you choose, Next is blocked. *(multi-owner)*
- [ ] Confirm the recipients line: Art Lead is **CC'd by default**, and shows
      "no duplicate CC" when the lead **is** the Art Lead.
- [ ] Add **Key points**; toggle **Meet to discuss**. *(persisted to request metadata on submit)*
- [ ] Request detail shows status workflow, **request ID** (`request_number`),
      attachments by kind, SharePoint folder panel. *(`portal/RequestDetail.tsx`)*

### Dashboard / Planner insights — `/planner` → **Insights** tab → `PlannerCharts.tsx`
- [ ] Charts render from the live board: **status**, **due-date health**,
      **by bucket**, **by priority**, **by assignee/lead**. *(`plannerMetrics.ts`)*
- [ ] Change a card's status/priority on the Board, return to Insights → charts update.
- [ ] **Board ⇄ Insights** toggle works. *(`pages/Planner.tsx`)*

### Graph (enterprise redesign) — `/graph` → `src/components/graph/*`
- [ ] Nodes have polished styling (halo, selection glow), **token-based edges**,
      legible **label pills**. *(`GraphCanvas.tsx`)*
- [ ] **Legend** shows entity types with **counts** + a **relation-style** key
      (solid/dashed meaning). *(`GraphLegend.tsx`)*
- [ ] **Empty state** (clear filters to 0 nodes) and **loading shimmer** are
      polished; a **stats** pill shows node/edge counts. *(`pages/Graph.tsx`)*
- [ ] Force sliders, filters, search, zoom/fit/export still work.

### Design revamp spot-checks
- [ ] Component **states**: hover/focus on cards & buttons; loading shimmer;
      empty states (Graph, comments, gallery).
- [ ] **Responsive**: narrow the window — Kanban scrolls horizontally; charts
      reflow; Graph falls back to a list under 768px.
- [ ] **A11y**: image thumbnails have alt text; dialogs have titles; focus rings
      visible; due colors paired with text labels (not color-only).

---

## Automated tests (proof without a DB)
```bash
npm run test     # 56 unit tests: routing, CC rule, due-date, mentions,
                 # notification triggers, Outlook prefill, Kanban ops, metrics
npx tsc --noEmit # clean
npm run build    # clean (pre-existing chunk-size advisory only)
```

## Where the changes live
- `src/lib/{artRouting,dueDate,mentions,notificationTriggers,outlookPrefill}.ts` + tests
- `src/config/artOwnership.ts`
- `src/features/planner/*` (board, cards, charts, demo, hook) + tests
- `src/components/common/*` (shared capability components)
- `src/components/request-form/ArtRequestRouting.tsx`, `src/pages/portal/EasyRequest.tsx`
- `src/components/graph/*`, `src/pages/Graph.tsx` (redesign)
- `supabase/migrations/20260627120000_planner_kanban.sql`, `supabase/functions/calendar-create-event/`
- Docs: `docs/REVAMP-SUMMARY.md`, `docs/GRAPH-PERMISSIONS.md`, `docs/design-review/*`
