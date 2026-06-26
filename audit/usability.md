# Usability & Accessibility Audit — Premier Project Hub v2 (`feat/v2`)

Read-only review. Scope: core workflow click-cost, dashboard edit-mode UX, keyboard
nav / visible focus / ARIA / skip-to-main, ⌘K + ⌘⇧D, form labels + error messaging,
native dialog usage, empty states.

Verification status: `tsc --noEmit` passes clean. `npm run lint` has 68 errors but all
are confined to `supabase/functions/*` and `tailwind.config.ts` — none in frontend `src/`,
so they do not affect usability.

---

## What is solid (verified, not flagged)

- **No native dialogs.** `rg "window\.(prompt|confirm)" src/` → no matches; no `window.alert`
  either. `window.prompt` for new-page creation was replaced by an accessible
  `PromptDialog` (`src/components/pages/PromptDialog.tsx`) with autofocus, Enter-to-submit,
  disabled-when-empty, and a real dialog title/description.
- **Skip-to-main present and correct.** `src/components/AppLayout.tsx:76-81` —
  `sr-only focus:not-sr-only` anchor to `#main-content`; the `<main id="main-content">`
  target exists at `:100`.
- **⌘K palette + ⌘⇧D theme toggle work.** Global `keydown` listener in
  `src/components/AppLayout.tsx:49-63` handles both (with `metaKey || ctrlKey`), and the
  account menu surfaces the same toggles with a visible `⌘⇧D` kbd hint (`:245`).
  `SearchTrigger` shows the platform-correct `⌘/Ctrl K` badge.
- **Focus visibility is sound.** `src/index.css:316-319` removes the native outline but
  pairs it with a `box-shadow: 0 0 0 3px hsl(var(--ring)/0.35)` ring on `*:focus-visible`.
  This block is scoped under `[data-design="modern"]`, which `DesignModeProvider` keeps
  permanently set on `<html>` (`src/providers/DesignModeProvider.tsx:101`) — verified, so
  the ring actually applies after the theme refactor.
- **Clickable list rows are keyboard-accessible.** `TaskListItem` and `ProjectListItem`
  use `role="button"`, `tabIndex={0}`, `aria-pressed`, descriptive `aria-label`, Enter/Space
  handlers, and a focus-visible ring (`src/components/tasks/TaskListItem.tsx:31-41`,
  `src/components/projects/ProjectListItem.tsx:35-45`). The task checkbox stops propagation
  and has its own aria-label.
- **Create modals are well-formed.** `CreateTaskModal` / `CreateProjectModal` use
  `<Label htmlFor>`, autofocus, character counts, disabled-until-valid submit, and a
  "Creating…" pending state.
- **Dashboard edit mode is discoverable and reversible.** `DashboardView.tsx` shows an
  obvious "Edit dashboard" button in view mode, then "Add card", "Reset" (gated by a
  confirm dialog `ResetLayoutDialog`), and "Done" in edit mode, plus a `aria-live="polite"`
  Saving/Saved status pill. Card move/resize/remove also exposed as labeled icon buttons
  with tooltips (`DashboardCard.tsx:110-114`) — i.e. a keyboard-usable alternative to the
  drag-and-drop reorder.
- **Empty states guide the user.** `EmptyState` (`src/components/ui/empty-state.tsx`) is
  used consistently with icon + title + contextual description + a relevant action button
  (Tasks, Projects, Pages, empty dashboard), and the copy adapts to search vs filter vs
  truly-empty.
- **Multi-step request form quality.** `EasyRequest` / `FullBriefRequest` have a progress
  bar + step counter, per-field validation gating Next, local draft autosave with
  Resume/Discard, a cancel-confirm dialog, and submit errors shown in an `Alert
  variant="destructive"` (which renders `role="alert"`, so submit errors are announced).
- **SPA route announcements exist.** `RouteAnnouncer` (`role="status" aria-live="polite"`)
  is mounted in `App.tsx:196` (see finding U2 for a coverage gap).

The "known + fixed" items in scope were spot-checked and look sound: the page editor reset
is correctly keyed on `pageId` only (`PageEditor.tsx:46-52`) with a clear comment on why,
which prevents the keystroke-clobbering regression.

---

## Findings

### U1 — Form validation errors are not programmatically associated or announced (medium)

**Location:** `src/pages/portal/EasyRequest.tsx:204,217,225,247,262,343`;
`src/pages/portal/FullBriefRequest.tsx:249,262,270,287,298,304,314,329,343,408`;
`CreateTaskModal.tsx:67`, `CreateProjectModal.tsx:60`.

**Detail:** Every primary form renders inline validation as a bare
`<p className="text-xs text-destructive">{errors.x.message}</p>`. The associated `<Input>`
gets **no `aria-invalid`** and the error `<p>` has **no `id` linked via `aria-describedby`**,
so a screen-reader user tabbing through the form is never told a field is invalid or why.
On a failed step transition (`handleNext` in `EasyRequest.tsx:91-94`) nothing is announced
and focus is not moved to the first invalid field — the user just silently stays on the step.
Notably the project already ships the accessible shadcn `Form` primitive
(`src/components/ui/form.tsx:93-94`) which wires `aria-invalid` + `aria-describedby` +
`role="alert"` on `FormMessage` — but none of the user-facing forms use it; they hand-roll
the markup and bypass it. So this is a consistent, fixable gap rather than missing infra.

**Recommendation:** Either adopt the existing `Form`/`FormField`/`FormMessage` primitives in
these forms, or, minimally, add `aria-invalid={!!errors.x}` to each control plus
`aria-describedby="x-error"` and give the error `<p id="x-error" role="alert">`. On step
validation failure, focus the first invalid field (`setFocus` from react-hook-form).

---

### U2 — RouteAnnouncer covers only 9 of ~25 routes; most announce a generic "Page" (low)

**Location:** `src/components/RouteAnnouncer.tsx:4-23`.

**Detail:** `pageNames` is a private 9-entry map. The app registers ~25 routes
(`App.tsx:144-176`). Pages such as `/pages`, `/timeline`, `/graph`, `/search`, `/requests`,
`/requests/new`, `/queue`, `/workload`, `/reports`, `/audit`, `/profile` fall through to the
literal string `"Page"`, so a screen-reader user navigating there only hears "Navigated to
Page". The feature works but is largely uninformative. A fuller, already-maintained label map
exists at `src/lib/routeLabels.ts` (`titleForPath`, 20 entries + a humanizing fallback) and
is what the shell header already uses for the visible title — the announcer just isn't using it.

**Recommendation:** Replace the local `pageNames` lookup with
`titleForPath(location.pathname)` from `@/lib/routeLabels` so the announced name matches the
visible header title and covers every route.

---

### U3 — "Create" actions from Dashboard and command palette navigate instead of opening the create modal (low)

**Location:** Dashboard header `New task` → `navigate("/tasks")` (`src/pages/Index.tsx:33-37`)
and `New project` → `navigate("/owned-projects")` (`:54-62`); command palette Quick actions
`Create task` → `go("/tasks")`, `New project` → `go("/owned-projects")`, `New page` →
`go("/pages")` (`src/components/search/GlobalCommandPalette.tsx:86-97`).

**Detail:** The create modals live on the list pages and are opened by the page's own
"New …" button. So creating a task from the dashboard or palette is: click "New task" → land
on `/tasks` → click "New task" again → modal. That's a 1→2-click (plus a route/lazy-load)
regression for the most common action, and a labeling mismatch — a control labeled "Create
task" that only navigates is misleading. ("New request" is fine: `/requests/new` is itself the
chooser screen.)

**Recommendation:** Have these entry points deep-link straight into the create modal — e.g.
navigate to `/tasks?new=1` (or `/owned-projects?new=1`) and have the page open `CreateTaskModal`/
`CreateProjectModal` when the param is present. Keeps it to a single click and makes the label
honest.

---

### U4 — Graph desktop view has no empty state for a zero-node result (low)

**Location:** `src/pages/Graph.tsx:178-189`.

**Detail:** On desktop, once loading finishes, the page always renders `<GraphCanvas>`. When
filters (or an empty workspace) yield `payload.nodes.length === 0`, the canvas is simply blank
with no message — the user can't tell whether it's still loading, broken, or genuinely empty,
or that loosening a filter would help. (The mobile path uses `GraphListFallback`, and the
`truncated` "too many" case is handled, but the empty case is not.)

**Recommendation:** When not loading and `payload.nodes.length === 0`, render an `EmptyState`
("No nodes match these filters") with a "Clear filters / See everything" action, mirroring the
existing `handleClearFocus` affordance.

---

### U5 — Sidebar navigation is not a labeled landmark (low)

**Location:** `src/components/ui/sidebar.tsx:404-410` (`SidebarMenu` renders a plain `<ul>`),
sidebar root renders `<div data-sidebar="sidebar">` (`:157,208`); consumed by
`src/components/AppSidebar.tsx:81`.

**Detail:** The primary navigation is not wrapped in a `<nav>` (or a `role="navigation"`
region) and the menu `<ul>`s carry no `aria-label`, so assistive-tech users get no "navigation"
landmark to jump to and the menu groups are unlabeled. Active state itself is fine — React
Router's `NavLink` (`src/components/NavLink.tsx`) automatically sets `aria-current="page"` on
the active item. This is a vendored shadcn default rather than a regression introduced here,
hence low priority, but it's a real landmark gap given the skip-link only targets `main`.

**Recommendation:** Wrap the sidebar nav region in `<nav aria-label="Primary">` (or pass an
`aria-label` onto the menu groups). Low-touch; keep the rest of the vendored component intact.

---

## Quick reference

| ID | Severity | Area | One-line |
|----|----------|------|----------|
| U1 | medium | Forms/a11y | Validation errors lack `aria-invalid`/`aria-describedby`/`role=alert` + no focus-to-error; accessible `Form` primitive is bypassed |
| U2 | low | A11y/SR | RouteAnnouncer covers 9 of ~25 routes; reuse `titleForPath` |
| U3 | low | Workflow | Dashboard/palette "Create" actions navigate to a list page (1→2 clicks) instead of opening the modal |
| U4 | low | Empty states | Graph desktop view shows nothing for a 0-node result |
| U5 | low | A11y/landmark | Sidebar nav not wrapped in a labeled `<nav>` landmark |
