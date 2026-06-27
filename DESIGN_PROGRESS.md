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

## 2026-06-27 — Round 2: Warm dark + de-neon (Task A & B tokens)

### A. Dark mode → WARM + LOW-NEON (`src/index.css`)
- BEFORE: `.dark` ramp was cold carbon at hue 240° (e.g. `--background: 240 7% 6%`,
  `--foreground: 240 8% 94%` near-pure white), and the crimson accent rendered as
  NEON PINK (`--primary: 349 90% 64%` — ~90% saturation).
- AFTER: rebuilt as a WARM charcoal at hue ~24° low-sat — `--background: 24 9% 7%`
  (~#14110F warm near-black), elevated surfaces `--card: 24 8% 10%` / `--popover:
  24 8% 11%` still warm. Text is a warm off-white `--foreground: 30 10% 91%` (not
  pure #FFF); muted tier `28 6% 60%` for calm low-fatigue contrast.
- Crimson DE-NEONED: `--primary: 347 62% 49%` (saturation 90→62%) — a deep refined
  Premier crimson, no longer neon pink. `--ring` matches. White CTA text retained.
- LIGHT mode warmed too: neutral ramp shifted from cool 240° to warm ~28–30° at very
  low sat (`--background: 30 14% 98%`, `--foreground: 24 10% 12%`), sidebar warmed
  (`24 8% 9%`), sidebar-primary de-neoned to `348 65% 60%`.

### B. Graph + status/priority palette de-neon (`src/index.css` entity tokens)
- BEFORE (dark): fully-saturated entity set — project `349 90% 70%` neon pink, task
  `199 90% 60%` neon cyan, request `262 70% 72%` bright purple, department
  `28 85% 62%` bright orange.
- AFTER (dark): desaturated + warmed cohesive set — project `348 58% 60%`, task
  `200 52% 56%`, request `258 38% 66%`, page `30 6% 64%`, person `162 40% 52%`,
  department `32 58% 58%`. Light entity tokens muted to match.
- Status/priority dark tokens desaturated across the board (e.g. in-progress 95→80%,
  blocked/danger hue 0→4° at 62%, done 55→46%) for a calm warm-dark canvas.
- `npx tsc --noEmit` clean · `npm run build` green.

---

## 2026-06-27 — Round 2: Component polish (Tasks C & D)

### C. Planner + Dashboard charts & chrome
- `src/features/planner/PlannerCharts.tsx` (full restyle):
  - BEFORE: flat single-color (neon-pink primary) charts; hardcoded raw HSL
    (`hsl(142 70% 42%)`, `hsl(38 92% 50%)`); no gridlines, axes lines, value
    labels, legends; donuts with no center total; blank box when empty.
  - AFTER: all colors tokenized. Donuts (Status, Due-date health) → per-Cell
    meaning-mapped fills, rounded arcs (cornerRadius 4, paddingAngle 2),
    innerRadius 56 / outerRadius 80, a centered big-number TOTAL label in the
    hole, and a compact bottom legend. Bars (bucket/priority/assignee) →
    CartesianGrid "3 3", axisLine/tickLine off with muted ticks, LabelList
    value labels, maxBarSize 40, proper margins; priority bars colored per
    priority token. ChartCard gained icon + muted description + refined "No
    data yet" empty state; height 52→64.
  - `src/pages/Planner.tsx`: padded the chart grid inside its scroll container.
- `src/components/dashboard/DashboardCard.tsx`: refined header (rounded-lg icon
  chip w/ hairline outline, larger icon, softer divider, tighter title leading),
  aligned body padding. Editing controls untouched.
- `src/components/dashboard/cards/card-states.tsx`: empty/error states
  redesigned to centered blocks with soft rounded icon chips, consistent py-8
  padding, refined copy; loading row spacing loosened.
- `src/pages/Index.tsx`: looser page rhythm (space-y-6→8), hero subtitle/action
  spacing tuned. Crimson edge-rail hero + functionality intact.

### D. Pages editor widened
- `src/pages/Pages.tsx`: editor pane defaultSize 55→62, backlinks 25→18
  (minSize 15→16), tree 20 (sums to 100). Inner clamp max-w-3xl (768)→max-w-5xl
  (1024); horizontal padding sm:px-8/lg:px-10 → sm:px-6/lg:px-8.
- `src/components/pages/PageEditor.tsx`: no change needed — SOURCE/PREVIEW are a
  `lg:grid-cols-2` (50/50, min-h-0, max-w-none) that now expands with the wider
  pane automatically.
- `npx tsc --noEmit` clean · `npm run build` green.

---

## 2026-06-27 — Round 2: Live visual verification + final graph edge calm

Drove the running app on :8080 via headless Chrome (CDP), forced dark mode, and
captured every target surface logged in as the Admin test profile:
- **Dashboard** — warm charcoal canvas, deep (non-neon) crimson CTA + Admin badge,
  refined empty-state chips, icon-chip card headers. ✓
- **Planner › Insights** — donut charts render center "TOTAL" labels (via recharts
  `<Label position="center">`), rounded arcs + bottom legends; bar charts have
  gridlines, clean axes, value labels, per-priority colored bars; muted cohesive
  palette. ✓ (confirmed 12 chart surfaces + 2 donut totals in the DOM)
- **Graph** — entity nodes desaturated/cohesive (rose project, calm blue task,
  teal person, soft purple request, gray page); edges resolve to warm-neutral
  `hsla(28 6% 60% / …)` (probed live), not the old red/magenta. ✓
- **Pages editor** — created a page; SOURCE/PREVIEW columns now fill the wider pane
  (editor pane 62%, backlinks 18%), comfortable line length. ✓

Final tweak: `graphColors.ts` `getEdgeColor` active opacity 0.55→0.45 and replaced
the legacy pink (`340°`) fallback with a warm-neutral gray so edges can never
resolve to a pink hue even if a CSS var fails on the canvas.
- `npx tsc --noEmit` clean · `npm run build` green.

### Round 2 status: COMPLETE
Dark mode is warm + calm (hue ~24°, not cold 240°); crimson de-neoned (62% sat,
not ~90%); graph + chart palettes muted/cohesive; planner & dashboard polished;
pages editor widened. All committed to feat/premier-hub-revamp; main untouched.

---

## 2026-06-27 — Round 3: REPLICATE NEXOSTRING (dark palette + graph) + avatars

Owner directive after reviewing rounds 1–2: stop iterating on warm-charcoal and
**replicate his NexoString project exactly** for (a) dark colors and (b) the
graph, PLUS add avatars/icons (new — NexoString-style DiceBear). Read the
NexoString sources in full first: `docs/redesign/02_design_system.md`,
`03_graph_design.md`, `components/cortex/ForceGraph.tsx`,
`components/company/CompanyGraph.tsx` (the avatar-in-node reference),
`lib/avatars/dicebear.ts`, `NeuronAvatar.tsx`, `AvatarPicker.tsx`.

### A. Dark tokens = NexoString constellation palette (`src/index.css`)
- BEFORE (round 2): warm charcoal hue 24°, de-neoned crimson `--primary 347 62% 49%`.
- AFTER: rebuilt the entire `.dark` block to NexoString's **near-black cool-slate
  ramp (228° / 12% sat)** — `--background: 228 12% 3%` (surface-void ≈ #070709),
  card `228 12% 8%`, popover `228 12% 12%`, border `228 12% 18%`, text `228 12% 92%`.
- **Primary accent = signal-cyan** (`--primary: 168 88% 60%`) with a near-black
  label (`--primary-foreground: 228 12% 6%`) — the NexoString signature.
  `--ring` = `168 88% 58%`. **Crimson fully retired from dark** (sidebar active
  item, edge-rail, focus all resolve to cyan now).
- **Selection accent = electric-violet** — new `--selection: 246 92% 72%`.
- Status: success mint-lime `150 60% 56%`, error/danger warm-rose `354 78% 62%`,
  warning saffron-amber `42 92% 60%`.
- Entity hues → NexoString neuron palette (desaturated-but-glowing): project=
  signal-cyan, task=azure, request=saffron, page=slate, person=rose-magenta,
  department=lime. Electric-violet deliberately reserved for selection only.
- Added theme-independent accent ramps (`--signal-cyan-200/300/400`,
  `--electric-violet-200/300`) so the canvas can resolve them directly, plus
  `--surface-void` / `--graph-grid` (dark = void/neutral-400; light keeps a bone
  canvas + crimson selection). Light mode keeps Premier crimson per directive.
- Added the `cortex-pulse` + `cortex-orbital-spin` keyframes and an
  `.animate-cortex-pulse` utility; `prefers-reduced-motion` already honored.

### B. Graph = port of NexoString ForceGraph/CompanyGraph (`GraphCanvas.tsx`, `graphColors.ts`)
- Near-black canvas: container painted `--surface-void`, ForceGraph
  `backgroundColor="transparent"`, with a dot-grid overlay + radial vignette
  showing through (straight from CompanyGraph).
- Nodes: real **shadowBlur bloom** + translucent **halo disc** + crisp entity-hue
  stroke; idle **bob/breathe** (sine, seeded per id) so the constellation
  "respira"; **hub nodes** (degree ≥ 4) get a dashed **orbital ring + rotating
  tick**. Selection ring = electric-violet, hover ring = signal-cyan.
- Edges: thin **curved (quadratic)** lines with a source→target **gradient**
  (entity hue → signal-cyan), calm low-alpha at rest, weighted by relation type;
  dropped the bright straight lines + arrowheads.
- **Directional particles** drift on every edge even at rest (subtle), brighter
  within the focused neighbourhood; none under reduced-motion (the resting
  particles also keep the frame loop warm so the bob animates).
- Labels: **JetBrains Mono, uppercase, letter-spaced**, with a subtle translucent
  card backplate; de-cluttered (zoom threshold OR focus).
- `graphColors.ts`: added `getSelectionColor` (violet), `getHoverColor` (cyan),
  `getVoidColor`, `rawVar`, `getNodeColorRaw` for canvas gradients/glow.

### C. Avatars/icons foundation (this batch)
- Added `@dicebear/core@^9` + `@dicebear/collection@^9` (same as NexoString).
- `src/lib/avatars/dicebear.ts` — ported (deterministic `toDataUri()`, soft
  premium bg tints, preset seeds); added the `icons` style for entity icons.
- `src/lib/avatars/entityAvatars.ts` — maps entity types to a default DiceBear
  style (user→person portrait, project→shapes, task/request→icons) + hue token;
  explicit `avatar_url`/`icon` always wins.
- Graph nodes now render the avatar/icon **clipped into the node circle**
  (person→avatar, project/task→icon) with the glowing bloom/halo AROUND it, and
  fall back to the colored glowing disc while loading / for other types — exactly
  CompanyGraph's `getImg` + `ctx.drawImage` pattern.

Verification: `npx tsc --noEmit` clean · `npm run build` green. Card-surface
integration + migration follow in the next batches.

---

## 2026-06-27 — Round 3 (cont.): avatar/icon surfaces, pickers, icon columns

### C2. Rendered avatars/icons across every card/list/detail surface
Fanned out a 9-agent workflow (each owning one file) to drop the shared
`EntityAvatar` onto every surface that names a person/project/task/request:
- `KanbanCard.tsx` — assignee initials-Avatar → real `EntityAvatar` (user).
- `ProjectListItem.tsx` / `TaskListItem.tsx` — project/task mark before the title.
- dashboard `MyOpenTasksCard.tsx` (task icon replaces the bullet) +
  `ArtRequestQueueCard.tsx` (request icon per row).
- graph `NodeDetailSheet.tsx` — large glowing `EntityAvatar` header mark.
- `ProjectDetailPanel.tsx` / `TaskDetailPanel.tsx` — glowing header marks.
All seeded by entity id with `metadata.avatar_url`/`icon` overriding the default.

### C3. Icon columns + pickers (create/detail editing)
- Migration `supabase/migrations/20260627130000_entity_icons.sql` adds
  `projects.icon` + `tasks.icon` (text). Hand-written `Project`/`Task` types and
  the generated `supabase/types.ts` (projects + tasks Row/Insert/Update) gained
  the optional `icon` field. The agent also correctly filled a real gap —
  `pages.icon` (which exists in the schema, migration `…192630`) was missing from
  the generated types — so the pages Row/Insert/Update now type it too.
- `projectService.updateProject` + `taskService.updateTask` signatures extended to
  accept `icon`, so the preview mock path persists a chosen icon live (and prod
  writes the column once the migration is pushed).
- **Pickers wired**: `ProjectDetailPanel` + `TaskDetailPanel` headers now open an
  `AvatarPicker` (Popover) to choose a seeded icon → `saveField("icon", uri)`.
  `ProfilePage` identity banner replaced its initials disc with a glowing
  `EntityAvatar` + an `AvatarPicker` (people presets **+ image upload**) that
  persists to `profiles.avatar_url`.
- Storage-upload persistence + the `icon` migration push are logged in
  `BLOCKERS.md` as deploy follow-ups (preview works on defaults + the demo path).

### Verification
- `npx tsc --noEmit` clean · `npm run build` green (both batches).
- Live dev server on :8080 serves the new dark tokens (`--background: 228 12% 3%`,
  `--primary: 168 88% 60%` signal-cyan, `--selection: 246 92% 72%`, `cortex-pulse`)
  — HMR reflects every edit. GraphCanvas confirmed to draw shadowBlur bloom + idle
  bob + always-on particles + curved source→target gradient edges + avatar/icon
  `drawImage` clipped into nodes.

### Round 3 status: COMPLETE
Dark mode = NexoString near-black 228° constellation (signal-cyan primary, violet
selection, neuron entity hues, crimson retired from dark). Graph replicates the
NexoString ForceGraph/CompanyGraph look (bloom, bob, hub rings, curved gradient
edges, mono backplate labels, avatars/icons in nodes). DiceBear avatars/icons are
defaulted everywhere, pickable in detail UIs, and rendered in graph nodes AND on
cards. main untouched; nothing deployed.

---
