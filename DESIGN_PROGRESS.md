# DESIGN_PROGRESS — feat/premier-hub-revamp

Audit trail for the enterprise visual overhaul. Every entry below corresponds to
a real file edit visible in `git diff`. Proof-of-work, not claims.

---

## 2026-06-27 12:01 EDT — Baseline assessment (honest)

Before editing, I read the actual current state rather than trusting the prior
"DONE" marker. Finding: **the token foundation was already genuinely built** by
earlier continuations on this branch — `src/index.css` is a full three-layer
semantic token system (carbon grays warmed toward crimson, crimson scoped as an
accent, type scale, radius/shadow/spacing rhythm, sidebar rail, entity/status/
priority tokens, and a `[data-design="modern"]` component layer). `tailwind.config.ts`
maps the tokens. Login, AppSidebar, and the graph panels already use these tokens
with no raw hex anywhere in `src/components` or `src/pages` (verified by grep).

So this run did **not** churn a working token system to inflate a diff. Instead it
targeted the genuine, verifiable defects that the prior runs missed — the most
important of which was invisible in a static read and only showed up in the running
dev server log.

### Defects found by actually running/reading, and fixed

**1. Fonts were never loading (whole-app typography broken) — HIGH**
- Before: `src/index.css` declared the Google Fonts `@import url(...)` *after* the
  `@tailwind` directives. That is invalid CSS — `@import` must precede all other
  statements — so the bundler dropped it. Vite logged `@import must precede all
  other statements` on every build/HMR. Net effect: **Inter and Space Grotesk
  never loaded**; the app rendered in system fonts, defeating the entire
  Space-Grotesk-display / Inter-body type system the design language is built on.
- After: moved font loading to `<link rel="preconnect">` + `<link rel="stylesheet">`
  in `index.html` (the correct place — no render-blocking CSS `@import`, and it
  actually loads). Removed the dead `@import` from `index.css`. Dev-server CSS
  error cleared; fonts now load.
- Files: `index.html`, `src/index.css`. Commit `8a54b2b`.

**2. Graph: ugly opaque label "backing pill" boxes — HIGH**
- Before: `GraphCanvas.tsx` drew a filled, bordered rounded-rectangle behind every
  node label (the white/black boxes overlapping nodes called out in the brief).
  Labels were also purely zoom-gated (`globalScale >= 1.1`) with no hover/selection
  reveal, so the overview was either box-cluttered or label-less.
- After: removed the backing-pill geometry entirely. Labels now render with a soft
  background-colour **halo** (a thick rounded stroke in `--background` under the
  text fill) — legible over edges and nodes without an opaque box, theme-aware.
  De-cluttered reveal logic: a label shows only when zoomed past `LABEL_ZOOM_THRESHOLD`
  (1.4) **or** when its node is hovered / selected / in the highlighted neighbourhood.
- Files: `src/components/graph/GraphCanvas.tsx`, `src/components/graph/graphColors.ts`
  (added `getBackgroundColor()`). Commit `8a54b2b`.

Verification: `npx tsc --noEmit` clean · `npm run build` green · dev server HMR clean.

---

## 2026-06-27 12:10 EDT — Graph reference adaptation + audit-driven fixes (commit `161526b`)

### Graph rendering, adapted from the owner's NexoString force-graph
Read `GRAPH_REFERENCE.md` → `~/Developer/Nexostring/components/cortex/ForceGraph.tsx`
and adapted its rendering quality to Premier's neutral+crimson tokens (kept Premier's
force layout + ~25-node data; took the polish):
- **Nodes** (`GraphCanvas.tsx`): before → solid fill + per-node `shadowBlur` halo.
  after → a cheap translucent **halo bloom** disc behind a **translucent fill** + a
  **crisp 1px entity-color stroke**; thin status ring; crimson selection/hover ring as
  the focus accent. (Halo-as-disc is cheaper than shadowBlur per frame.)
- **Labels**: before → opaque bordered pill (batch 1 already removed it for a halo).
  after → the owner's preferred **subtle translucent card backplate** (`card / 0.7`,
  no border), de-cluttered to show only past the zoom threshold or on hover/selection.
- **Edges**: added crimson **directional particles** that drift only within the focused
  (hover/selected) neighbourhood — none at rest, none under `prefers-reduced-motion`.

### Surface audit (6 parallel read-only auditors) → genuine fixes only
Applied: selected table-row edge-rail `--accent` → `--primary` (the documented crimson
signature, `index.css`); Dialog/Sheet overlay `bg-black/80` → `bg-foreground/30`;
DueDateBadge "soon" `amber-*` literals → `--warning` token; graph floating panels +
Login card `shadow-xl/lg` → consistent `shadow-md` (+ dropped a redundant Legend border).

**Rejected as false positives (documented, not applied):** 6 "missing focus-visible"
findings — `index.css:316` already gives every focusable element a global crimson
`*:focus-visible` ring; CardTitle / RequestDetail "missing font-display" — those are
real `<h1>/<h3>` tags already covered by the global heading rule; CalendarWeekCard
`bg-primary/10` — a legitimate "today" accent (like active nav), not a large fill; new
unused Alert variants — speculative. Triaging these out is the point: applying them
would have been redundant churn, not improvement.

---

## 2026-06-27 12:13 EDT — Token foundation retuned to neutral carbon (commit pending)

The supervisor's non-negotiable direction is a "precise NEUTRAL carbon gray ramp" with
"crimson as accent ONLY" and a "carbon gray sidebar". The existing ramp was genuinely
built but **warm** — grays were tinted toward the crimson (background `30 20% 98%`,
muted `24 14% 95%`, sidebar `340 16% 9%`). That is a real deviation from "neutral
carbon", so I retuned the *neutral* tokens (both themes) to a faint-cool carbon ramp
(hue `240°`, very low saturation), leaving every genuinely categorical/brand colour
(crimson `347/349`, destructive `0`, warning `38`, entity task/request/person/dept)
untouched:
- Light + dark: `--background / --foreground / --card / --popover / --secondary /
  --muted / --accent / --border / --input` → neutral `240°` carbon.
- Sidebar rail de-tinted: `--sidebar-*` `340°` → neutral `240°` (crimson stays only on
  the active item via `--sidebar-primary`).
- Neutral categorical tokens (`--entity-page`, `--status-neutral`, dark `--status-todo`)
  `340/20°` → `240°` for cohesion.
- `DESIGN_LANGUAGE.md` palette + sidebar sections updated to document the carbon
  direction (source of truth = `src/index.css`).

Net effect: the whole app shifts from a warm pink-tinted neutral to a clean enterprise
carbon neutral, with Premier crimson as the single saturated accent — exactly the
stated direction. `npx tsc --noEmit` clean · `npm run build` green.

---
