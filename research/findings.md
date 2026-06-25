# Premier Project Hub v2 — Research Findings

> Synthesis across the five app studies (Notion, Obsidian, AFFiNE, AppFlowy, Anytype) plus the Supabase keys/auth doc, written to brief the v2 build agents: **DESIGN-SYSTEM**, **DASHBOARD**, **GRAPH**, **PAGES**, **INTEG-OUTLOOK**, **INTEG-TEAMS**. Recommendations are decisive on purpose — build agents should follow them. Source docs live alongside this file (`research/notion.md`, `obsidian.md`, `affine.md`, `appflowy.md`, `anytype.md`, `supabase-keys.md`); URLs are reused from their inline citations.
>
> Our stack & constraints (preserve): React 18 + Vite 5 + TS (strict) + Tailwind v3 + shadcn/ui + Supabase + TanStack Query. Microsoft Entra SSO via Supabase Auth, RLS everywhere, read-only AI assistant, feature flags. Workflow to preserve: **projects ↔ tasks ↔ pages** (block editor) + an **art-request portal**. All new server logic = **Supabase Edge Functions**; all new tables need **RLS + GRANTs**. `react-force-graph-2d` is already a dependency.

---

## 1. Cross-app feature matrix

Cloud-first SaaS (Notion) vs. local-first/CRDT tools (Obsidian, AFFiNE, AppFlowy, Anytype). We are **cloud-first by design** (Supabase is the source of truth), so we borrow *patterns and feel*, not the local-first/CRDT engines.

| Feature | Notion | Obsidian | AFFiNE | AppFlowy | Anytype | Takeaway for us |
|---|---|---|---|---|---|---|
| **Linking / backlinks** | Page mentions + relations; `@`-mention | Core: `[[wikilinks]]`, heading/block targets, aliases; backlinks panel (linked + unlinked mentions) | `/link` to any page/block; backlinks panel shows inline reference context (Dec 2024) | Page links; two-way relations between DB records | First-class typed **relations** (attribute *and* edge); "linked from" back-refs | Adopt `[[ ]]` wikilink UX (Obsidian) **+** typed FK relations under the hood (Anytype). Backlinks panel = high value, low cost. |
| **Graph view** | — | **The reference** — force-directed, tunable forces, color groups, local+global, depth slider | Manual edgeless *canvas* as relationship map; no auto force-graph | — | Auto-generated graph **from typed relations** (not free text) | Build force-graph from our FK relations (Anytype's model) using Obsidian's interaction grammar. Encode status/priority as color/size — the gap Obsidian users name. |
| **Database / multi-view** | Best-in-class: Table/Board/Calendar/Timeline/List/Gallery, one source many views, per-view filter/sort/group | — (plugins like Dataview) | Blocks → DBs with kanban/list/timeline/table views | Grid/Kanban/Calendar/Gallery/List/Feed/Chart; **linked views** of one source | Sets/Queries (live) vs Collections (manual); Grid/Kanban/Calendar/Gallery/Graph | One Supabase task source → Table+Board+Calendar views over a shared TanStack Query cache. "Linked views" (AppFlowy) = each dashboard widget is a saved view config, not a copy. |
| **Block editor** | The gold standard; typed draggable blocks, nesting, columns | Live-preview Markdown (plain-text files) | BlockSuite; markdown + rich text, shared/synced blocks | Notion-style blocks + markdown shortcuts (`#`, `-`, `/`) | Notion-style blocks, instant open | Polish our existing block editor; match Notion's block model + markdown shortcuts. |
| **Slash menu** | Defining interaction: `/` inserts blocks, AI, `/meet` | Core plugin (off by default) | Yes (`/link` etc.) | Yes (`/` command menu, community-requested) | Yes | Ship a fast `/` palette in PAGES; it's the single interaction that makes editors "feel" Notion-fast. Low cost, high adoption. |
| **Command palette (⌘K)** | Quick-find `Cmd/Ctrl+P` | **Heart of the UX**: `Cmd+P` palette (shows hotkeys), `Cmd+O` quick switcher | Yes | — (keyboard-light) | Tabs + object switcher (2026) | Global ⌘K (navigate + run commands + quick-switch entities). Steal Obsidian's "show the hotkey in each row" teaching pattern. |
| **Local-first / offline** | No (cloud) | Yes (files on disk) | Yes (CRDT/OctoBase) | Yes (Rust core) | Yes (any-sync, E2E) | **Out of scope** as an engine. Replicate the *feel* via TanStack Query optimistic updates + cached reads (no spinners). |
| **Real-time collaboration** | Yes (cloud multiplayer) | Limited (sync add-on) | CRDT, "gold standard" conflict-free | Local-first + optional cloud | E2E real-time (2025–26 roadmap) | **Out of scope** for v2 (no CRDT). Supabase Realtime presence/notifications only if cheap. |
| **AI** | AI Meeting Notes, search, autofill (Business/Ent) | Plugins | Doc AI | Free **local AI via Ollama** + cloud models; table autofill | Limited | Keep our **read-only** AI assistant. Highest-value AI bet = meeting summary/action-items from Teams transcripts (see §4). |
| **Integrations (MS/Outlook/Teams)** | Outlook AI Connector (email-only, search-only); **no deep DB↔calendar sync**, no Teams transcript fetch | — | — | — | — | **Open lane.** Notion is thin here. Our MS-Graph-native Teams transcripts + Outlook calendar on project pages can *beat* Notion. (§4) |
| **Theming / density** | Light/dark, clean | Themes + CSS, keyboard-first | Modern UI, themes/fonts | Custom themes/fonts | Clean minimal UI | One revamped dark/light token system (§3a); Linear/Vercel/Raycast aesthetic, comfortable+compact density. |
| **Templates** | Strong (DB templates) | Template plugins | Templates | DB templates | Per-Type templates + auto type-query | Project/task/page templates for recurring flows (e.g. art-request projects). Low cost (Anytype #4). |
| **Data ownership / self-host** | No | Files | MIT, self-host | AGPLv3, Docker | MIT any-sync, self-host | N/A for an internal tool, but it's *why* users love these — translate to "snappy + trustworthy," not literal self-host. |

---

## 2. Ranked shortlist — high-love × low-complexity, mapped to our workflow

Ranked best-first by (love × low complexity × fit to our existing routes/data). Complexity is sized for **our** stack (Supabase as source of truth, not CRDT).

1. **Command palette (⌘K) — global navigate + run + quick-switch.** *(S; Obsidian's most-loved UX, `obsidian.md`.)*
   The heart of Obsidian's keyboard-first feel: `Cmd+P` fuzzy-runs any command and *shows its hotkey*; `Cmd+O` jumps to any note ([obsidian rocks](https://obsidian.rocks/for-beginners-and-pros-alike-the-command-palette-in-obsidian/), [help](https://help.obsidian.md/plugins/command-palette)). **Maps to us:** one shadcn `Command` (cmdk) dialog that searches across **projects/tasks/pages** (quick-switch via TanStack Query) and runs actions (new task, open route: dashboard/tasks/projects/pages/timeline/graph/reports/audit/search/admin). Cheap, instantly raises perceived quality, and it's the connective tissue for every other route.

2. **Backlinks / "Referenced by" panel.** *(S–M; Obsidian + AFFiNE + Anytype all converge here.)*
   Obsidian's linked/unlinked mentions ([deepwiki](https://deepwiki.com/obsidianmd/obsidian-help/4.2-internal-links-and-backlinks)), AFFiNE's inline-context backlinks ([Dec 2024 update](https://affine.pro/blog/whats-new-affine-dec-update)), Anytype's "linked from" ([Toksta](https://www.toksta.com/products/anytype)). **Maps to us:** on any project/task/page detail, render "Referenced by" from our FK relations + page `[[ ]]` mentions. Anytype proves it's "cheap once the relations layer exists; high perceived value" (`anytype.md` #5). Also directly feeds the graph.

3. **Slash menu (`/`) in the block editor.** *(S; Notion/AppFlowy.)*
   `/` inserts blocks (and AI actions) inline — "the document *is* the command surface" ([notion.md](https://www.notion.com/help/ai-meeting-notes)); AppFlowy shows markdown shortcuts (`#`, `-`, `/`) make typing fluid ([GitHub Discussion #1271](https://github.com/AppFlowy-IO/AppFlowy/discussions/1271)). **Maps to us:** PAGES polish — `/` palette for headings, todo, callout, code, embeds, plus `/link` and `/meet` (kicks off the meeting-notes flow in §4).

4. **Color/size-encoded force-directed graph of projects↔tasks↔pages.** *(M; Obsidian grammar + Anytype data model.)*
   Our entities are already a typed graph. Build with `react-force-graph-2d` using Obsidian's four-force model and node-size-by-degree ([obsidian.md](https://obsidian.md/help/plugins/graph)), but derive edges from **real FK relations** (Anytype, `anytype.md` #2) and **encode status/priority as color/size** — the operational layer Obsidian users say is missing ([codeculture](https://codeculture.store/blogs/developer-culture/obsidian-graph-view-useful)). Default to the **local graph** rooted on the open entity (least laggy, most praised). Full config in §3c.

5. **One task source → many synced views (Table / Board / Calendar).** *(M; AppFlowy + Notion + Anytype all rate this their top idea.)*
   "Enter data once, see it as table/board/calendar without duplicating" ([notion.md](https://www.notion.com/help/guides/using-database-views)); AppFlowy's linked views ([opentechhub](https://www.opentechhub.io/appflowy/)). **Maps to us:** tasks already live in Supabase; add a view layer over the shared TanStack Query cache — Table (exists-ish), Board grouped by status, Calendar by due date. Per-view filter/sort/group state. Kanban + calendar are the heavy lifts.

6. **Typed relations + rollups across projects↔tasks↔pages.** *(M; AppFlowy + Anytype + Notion.)*
   Relation links a row to another; a **rollup** aggregates from related rows ("count of open tasks per project") ([notion.md](https://www.notion.com/help/intro-to-databases)). **Maps to us:** a lightweight typed-edge/relation layer over our Postgres tables (Anytype #1) → powers backlinks (#2), the graph (#4), and dashboard rollup widgets (#7). Foundational — worth building early even though it's M.

7. **Editable dashboard = grid of saved-view widgets ("linked views").** *(M; AppFlowy #2 + Anytype Sets.)*
   Each dashboard card is a **filtered/grouped view** of tasks/projects (a saved query), not a copy ([opentechhub](https://www.opentechhub.io/appflowy/)); Anytype's Queries vs Collections ([sets](https://doc.anytype.io/anytype-docs/getting-started/sets)). **Maps to us:** the DASHBOARD route — draggable widget grid where each widget references a saved view config + a card type. Persist layout per-user (see §3b).

8. **Linked-page / database embeds inside pages.** *(M; Notion "linked databases" + AFFiNE database blocks.)*
   Embed a live, filtered task list/project table *as a block* in a page ([notion.md](https://www.notion.com/help/guides/using-database-views), [affine.pro](https://affine.pro/blog/pages-linking-to-pages)). **Maps to us:** "this project's open tasks" rendered inside the project page — mostly UI + query wiring on data we already have.

9. **Per-type templates.** *(S; Anytype #4.)*
   Each Type ships a template + an auto "all instances" view ([Anytype Types](https://doc.anytype.io/anytype-docs/getting-started/types)). **Maps to us:** project/task/page templates for recurring flows — especially **art-request projects** (pre-fill the portal's standard fields/checklist). Small, immediately useful.

10. **Meeting notes on a page via MS Graph (Teams transcript → summary → action items).** *(L; Notion's headline feature — but we beat it by reusing Teams.)*
    Notion records locally and forgoes Teams ([notion.md](https://www.notion.com/help/ai-meeting-notes)); we let **Teams do recording + transcription** and fetch the `.vtt` via Graph — better speaker attribution, no recorder to maintain. This is the v2 differentiator. Ranked last only because it's L and depends on the integration agents; full design in §4.

### Explicitly OUT of scope / too costly for v2

- **CRDT real-time multiplayer editing** (AFFiNE/OctoBase, Anytype any-sync). We are Supabase cloud-first; replicate the *snappy feel* with TanStack Query optimistic updates, not a CRDT engine (`affine.md` #5, `appflowy.md` #6).
- **Full local-first / offline-first sync.** Out — same reason. No on-device primary copy.
- **Edgeless / infinite canvas** (AFFiNE's signature). High effort (free-form layout, drag/resize, embedding live widgets); defer past v2. The *editable dashboard grid* (#7) is the bounded subset we actually need now.
- **Global graph as the default surface.** Obsidian's "hairball" past ~200 nodes ([codeculture](https://codeculture.store/blogs/developer-culture/obsidian-graph-view-useful)). Default to local graph; gate the global view (see §3c).
- **An in-app audio recorder / our own bot that joins calls.** Out — Teams already records and transcribes; consume its artifacts (§4). Only a fallback browser recorder for non-Teams meetings, behind a flag.
- **Synced/reusable blocks across pages** (AFFiNE) and **object-thread discussions** (Anytype 2026). Defer — needs a block-reference model; not v2-critical.
- **Per-user typed-field/schema builder UI** (AppFlowy/Anytype full flexibility). Avoid Anytype's "uniquely complicated" trap ([MakeUseOf](https://www.makeuseof.com/anytype-app-review-notion-obsidian-comparison/)) — ship **opinionated defaults** (fixed types/templates), power under the hood, simple surface.

---

## 3. Concrete UX patterns for build agents

### (a) DESIGN-SYSTEM — one revamped dark/light token system

**Token strategy (three layers).** Define **primitive** tokens (raw palette: neutral 0–1000, brand, semantic hues) → **semantic** tokens (`--bg`, `--bg-subtle`, `--surface`, `--border`, `--text`, `--text-muted`, `--accent`, `--ring`, `--success/warn/danger`) → **component** tokens where needed. Map semantics to Tailwind via CSS variables in `:root` and `.dark` (shadcn already uses `hsl(var(--…))`); **dark/light differ only at the semantic layer** so components never branch on theme. Keep one accent; derive hover/active by lightness steps, not new hex.

**Aesthetic = Linear / Vercel / Raycast (precise specs):**
- **Color:** near-neutral grays with a single saturated accent; dark mode is *not* pure black — use `~#0B0B0E`–`#111114` backgrounds with elevated surfaces a few % lighter. Borders are low-contrast hairlines (`rgba(255,255,255,0.08)` dark / `rgba(0,0,0,0.08)` light), not solid lines.
- **Spacing scale:** 4px base — `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`. Tight, consistent gutters. Default control height **32–36px** (compact), comfortable rows 40px.
- **Radii:** `sm 6px / md 8px / lg 12px / xl 16px`; pills/avatars full. Cards `lg`, inputs/buttons `md`.
- **Borders:** 1px hairline + the token above; rely on **border + subtle surface elevation**, not heavy shadow.
- **Shadows:** soft, low-spread, multi-stop — e.g. `0 1px 2px rgba(0,0,0,.06), 0 2px 8px rgba(0,0,0,.04)`; in dark mode lean on surface lightness over shadow. Reserve a larger shadow for popovers/command palette only.
- **Motion / easing:** fast and restrained — **120–180ms** for hovers/popovers, **200–250ms** for larger transitions; easing `cubic-bezier(0.2, 0, 0, 1)` (Linear-style ease-out). Respect `prefers-reduced-motion`.
- **Typography:** Inter/Geist-style UI sans; sizes `12 / 13 / 14 (base) / 16 / 20 / 24 / 32`; tight line-height on headings (~1.2), 1.5 body; medium (500) for UI labels, not bold everywhere.

**Command palette (⌘K) pattern.** Use shadcn `Command` (cmdk) in a centered dialog: fuzzy search, grouped results (Navigation / Tasks / Projects / Pages / Actions), each row shows its **keyboard hotkey on the right** (Obsidian's teaching trick, [obsidian.md](https://help.obsidian.md/plugins/command-palette)), arrow-key nav, `Esc` to close, recent items on open. This component is owned by DESIGN-SYSTEM as a primitive; DASHBOARD/GRAPH/PAGES register entries into it.

**Density.** Provide a **Comfortable / Compact** toggle that swaps a spacing token set (row height, padding) — persisted per-user. Default Comfortable; tables and the graph sidebar default-benefit from Compact.

### (b) DASHBOARD — user-editable card grid

**Pattern (from AppFlowy "linked views" + Anytype Sets):** each card is a **saved view config** (a filtered/grouped query over tasks/projects), not duplicated data ([appflowy.md](https://www.opentechhub.io/appflowy/), [anytype.md](https://doc.anytype.io/anytype-docs/getting-started/sets)).

- **Card registry.** A typed registry `{ type, title, defaultSize, render(config) }` — card types e.g. `my-open-tasks`, `project-rollup`, `recent-pages`, `calendar-week`, `art-request-queue`, `mini-graph`. Adding a new widget = registering one entry; the grid stays generic.
- **Add / remove / reorder / drag-resize.** Grid of cards with drag-to-reorder and resize (column-span). Keep it bounded — a **CSS-grid or `react-grid-layout`-style** lane model (12-col), *not* a free-form canvas (that's out of scope, §2).
- **Each widget = `{ id, type, config (view/filter), x, y, w, h }`.** `config` is the saved view (filter/sort/group + source table), reusing the same view engine as the Tasks route (#5/#6).
- **Persist layout per-user** in a Supabase table (RLS `user_id = auth.uid()`), e.g. `dashboard_layouts(user_id, layout jsonb, updated_at)` — single-row-per-user JSON is simplest; debounce writes, optimistic update via TanStack Query. Provide a "Reset to default layout."
- **Edit mode toggle:** view mode (read-only, no drag handles) vs. edit mode (show handles, add-card menu, remove buttons) — mirrors the clean→structured progressive disclosure all five apps use.

### (c) GRAPH — Obsidian-style graph with `react-force-graph-2d`

Distilled from `obsidian.md` (interaction grammar) + `anytype.md` (edges from typed relations, not free text). **Data:** nodes = projects/tasks/pages; edges = FK relations (task→project, page→task, page→page) **plus** `[[ ]]` page mentions. Build the node/link arrays from one TanStack Query selector; recompute `degree` per node.

**Forces (d3-force under the hood — start here, expose as sliders mirroring Obsidian's four):**
```js
graph
  .d3VelocityDecay(0.3)                 // settle speed
  .d3Force('charge').strength(-120)     // repel  (Obsidian "Repel force")
graph.d3Force('link')
  .distance(60)                         // link distance 40–80 (Obsidian "Link distance")
  .strength(0.7)                        // link force (rubber-band tension)
graph.d3Force('center', d3.forceCenter())  // center force — raise to compact, stop sprawl
graph.d3Force('collide', d3.forceCollide(r => nodeRadius(r) + 2)) // prevent overlap
// on any slider change:
graph.d3ReheatSimulation()
```
Tuning guidance (Obsidian): balance **link force × link distance** for edge length first, then trade **center vs. repel** for compactness vs. readability ([forum](https://forum.obsidian.md/t/graph-view-physics-and-force-directed-graphs/72586)).

**Node sizing by degree (Obsidian "size ∝ references").** Precompute degree; set `nodeVal = degree` (area-proportional) so hub projects render larger. Draw with `nodeCanvasObject` + `nodeCanvasObjectMode('after')` to paint labels above the default circle; use `nodeRelSize` for global scale (a "Node size" slider).

**Color groups by node type + status (our operational upgrade over Obsidian).** Color by **type** (project / task / page) as the base, and by **status** (active / blocked / done) or priority as a tint/border — Obsidian users' #1 complaint is that the graph shows "topology, not operations" ([codeculture](https://codeculture.store/blogs/developer-culture/obsidian-graph-view-useful)); baking status into color/size fixes exactly that. Pull all colors from the DESIGN-SYSTEM tokens (theme-aware).

**Hover highlight + neighbor dimming.** On `onNodeHover`, compute the node's neighbor set once; in `nodeColor`/`linkColor` dim everything outside the set (lower alpha) and highlight the node + its links. Clear on hover-out. Same grammar as Obsidian's hover behavior.

**Click-to-navigate.** `onNodeClick` → route to that entity's detail page via the existing router (e.g. `/projects/:id`, `/tasks/:id`, `/pages/:id`). Right-click → context menu (open, open in new pane, focus local graph).

**Filters (shadcn controls in a side panel):** toggle node **types**, **status** (hide done), **orphans** (degree 0), and a **search box** that dims non-matches (Obsidian's filter panel). Add a **local-graph depth slider (1–3)** when rooted on an entity.

**Local vs global + performance (the critical lesson).** Default surface = **local graph** rooted on the currently-open project/task/page (depth 1–3) — least laggy, most-praised mode ([obsidian.md](https://deepwiki.com/obsidianmd/obsidian-help/4.5-graph-view)). Reserve the **global graph** for an explicit "see everything" action. Heed the hairball: useful <50 nodes, degrades past ~200, perf concern past ~500 ([codeculture](https://codeculture.store/blogs/developer-culture/obsidian-graph-view-useful)). For our likely counts: render directly up to a few hundred nodes; **past ~300–500, cap/cluster/paginate** (e.g. collapse a project's tasks into one expandable node, or scope to a project subtree). Disable per-frame pointer tracking only if profiling demands it; consider `cooldownTicks`/`warmupTicks` to freeze layout after settling.

### (d) PAGES — block-editor polish

**Block-editor interactions (Notion model).** Page = ordered tree of typed draggable blocks (text/heading/toggle/callout/code/image/embed/child-page/embed-view). Hover reveals the **drag handle + `+`** ([notion.md](https://www.notion.com/help/intro-to-databases)); blocks reorder by drag, nest, and drop into columns. Match the snappy feel with optimistic updates (no save spinner).

**Slash menu (`/`).** Inline searchable palette that filters as you type ([notion.md](https://www.notion.com/help/ai-meeting-notes)): block types + AI actions + `/link` + `/meet`. Plus **markdown shortcuts** (`#`→heading, `-`/`*`→bullet, `[]`→todo, ` ``` `→code) from AppFlowy ([appflowy.md](https://github.com/AppFlowy-IO/AppFlowy/discussions/1271)). Keep it keyboard-only navigable.

**`[[ ]]` wikilinks + backlinks (Obsidian).** Typing `[[` triggers **fuzzy autocomplete** over project/task/page titles + aliases ([obsidian.md](https://deepwiki.com/obsidianmd/obsidian-help/4.2-internal-links-and-backlinks)); selecting inserts a typed link (stored as a relation, so it feeds the graph). Support `[[Title|display text]]`. Render a **Backlinks / "Referenced by" panel** showing linked mentions (and optionally unlinked mentions with one-click "link") — Obsidian's two-set model, AFFiNE's inline-context presentation ([affine.pro](https://affine.pro/blog/whats-new-affine-dec-update)).

**Linked-page / database embeds.** A block that embeds a **live filtered view** of tasks/projects (Notion linked-DB / AFFiNE database block) — e.g. drop "this project's open tasks" into a project page; reuse the view engine from §2 #5. Read-only embed first; inline-edit later.

**Cross-agent note:** PAGES owns `/meet` *insertion* but the meeting pipeline (Graph fetch → transcript → summary blocks) is INTEG-TEAMS (§4). Agree on the block schema for `transcript` / `summary` / `action-items` blocks up front.

---

## 4. Recommended Teams + Outlook + meeting-transcription approach (Supabase Edge Functions + RLS)

**Structural advantage to exploit:** our org runs on Microsoft 365. Notion deliberately forgoes Teams and records locally, so its speaker labels are unreliable beyond 1:1/English ([sally](https://www.sally.io/blog/notion-ai-meeting-notes-review)). **We let Teams record + transcribe and fetch the artifacts via Microsoft Graph** — Teams ties transcript lines to Entra identities (far better attribution) and there's no in-app recorder to maintain ([notion.md](https://www.notion.com/help/ai-meeting-notes)). This is also the open lane: Notion's Outlook connector is **email-only, search-only, with no deep DB↔calendar sync** ([notion.md](https://www.notion.com/help/microsoft-outlook-ai-connector)) — a Graph-native build beats it.

### 4.1 Transcription engine — comparison and pick

| Engine | Privacy | Cost | Accuracy / diarization | Ops burden |
|---|---|---|---|---|
| **Teams native transcript (via Graph)** | **Best** — stays in M365 tenant; no third-party processor | **Free** (already licensed) | Strong; lines tied to Entra identities → reliable speaker labels | **Lowest** — just fetch `.vtt`, no model to run |
| Self-hosted **whisper.cpp / faster-whisper** | **Excellent** — audio never leaves our infra | Compute only (GPU helps) | Good WER; **no built-in diarization** (bolt on pyannote) | High — host/scale a GPU service; not a fit for Edge Functions |
| OpenAI **Whisper API / gpt-4o-transcribe** | Audio leaves tenant to OpenAI | Per-minute, low | High accuracy; weak diarization | Low (API) |
| **Deepgram Nova-3** | Audio leaves tenant | **Cheap**, fast | Strong, **built-in diarization**, streaming | Low (API) |
| **AssemblyAI** | Audio leaves tenant | Moderate | High, good diarization + features | Low (API) |
| **Azure AI Speech** | **Good** — stays in Microsoft/Azure tenant boundary | Moderate | Strong, diarization | Low–moderate (Azure resource) |

**PICK: Teams native transcript via Microsoft Graph as the primary path** — and run **summary/action-item extraction through our existing read-only AI assistant** in an Edge Function (parse VTT → speaker-tagged segments → LLM summary). This is the privacy-respecting choice (audio/transcript never leave the M365 tenant), zero per-minute cost, best speaker attribution, and lowest ops — no model to host, which matters because Supabase Edge Functions can't run a Whisper GPU workload.

**Pragmatic fallback (behind a feature flag), for in-person / non-Teams meetings only:** a browser recorder that streams to an engine, then the *same* summarizer. Prefer the **most privacy-respecting viable option in priority order**: (1) **Azure AI Speech** if we want to keep audio inside the Microsoft/Azure tenant boundary; (2) **self-hosted faster-whisper + pyannote** if we stand up a GPU worker and want true on-prem; (3) **Deepgram Nova-3** only if we accept a third-party processor for its cheap, diarized, streaming convenience ([notion.md](https://www.notion.com/help/ai-meeting-notes)). Default the fallback **off** — most meetings are Teams.

### 4.2 MS Graph data-flow

**Auth:** reuse the **existing Entra app** (same one behind Supabase Entra SSO). Add an OAuth consent flow for Graph scopes; exchange the code in an Edge Function; store tokens **server-side only** (never in the browser bundle).

**OAuth scopes (delegated, per-user):** `OnlineMeetingTranscript.Read.All`, `OnlineMeetings.Read`, `Calendars.Read`, `Mail.Read`, plus `offline_access openid profile` for refresh tokens ([notion.md](https://learn.microsoft.com/en-us/graph/api/onlinemeeting-list-transcripts?view=graph-rest-1.0)). Tenant-wide automation (app-only) would need the application-permission equivalents **+ an application access policy granted by a tenant admin** ([graphpermissions](https://graphpermissions.merill.net/permission/OnlineMeetingTranscript.Read.All)).

**Endpoints:**
- Transcripts: `GET /me/onlineMeetings/{meetingId}/transcripts` then `.../transcripts/{id}/content?$format=text/vtt` → a **`.vtt`** file ([Microsoft Learn — List transcripts](https://learn.microsoft.com/en-us/graph/api/onlinemeeting-list-transcripts?view=graph-rest-1.0), [Get callTranscript](https://learn.microsoft.com/en-us/graph/api/calltranscript-get?view=graph-rest-1.0)).
- Resolve meeting id from a calendar event's join URL: `GET /me/onlineMeetings?$filter=JoinWebUrl eq '{url}'`.
- Calendar: `GET /me/events` and `/me/calendarView` to discover meetings and link them to pages/projects.
- Mail: `GET /me/messages` for Notion-parity email search.
- **Change notifications instead of polling** (transcripts arrive async): subscribe to `users/{userId}/onlineMeetings/getAllTranscripts` (user-scoped) or `communications/onlineMeetings/getAllTranscripts` (tenant); the notification carries meeting + organizer id so we fetch the transcript the moment it's ready ([Microsoft Learn — overview](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/meeting-transcripts/overview-transcripts)). Subscriptions expire (~3 days) and must be renewed by cron.

**Token storage:** refresh tokens encrypted at rest in `ms_connections.refresh_token_enc`; **read only inside Edge Functions via the secret key** (`sb_secret_...`, see §4.4). Never expose to the client. Verify the user JWT (Entra→Supabase session) on user-facing functions so RLS applies.

### 4.3 Supabase schema sketch (with RLS)

```sql
-- per-user Graph OAuth tokens (refresh token encrypted at rest)
create table ms_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ms_tenant_id text not null,
  ms_user_id text not null,
  refresh_token_enc bytea not null,        -- encrypted; only Edge Functions decrypt
  scopes text[] not null,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- webhook subscription lifecycle (Graph subscriptions expire ~3 days)
create table graph_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource text not null,
  subscription_id text not null,
  expiration timestamptz not null,
  client_state text not null
);

-- calendar events (link Outlook events to projects)
create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ms_event_id text not null,
  subject text,
  join_web_url text,
  start_at timestamptz,
  end_at timestamptz,
  project_id uuid references projects(id) on delete set null
);

-- transcript linked to a page AND/OR project
create table meeting_transcripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  page_id uuid references pages(id) on delete set null,
  ms_meeting_id text not null,
  subject text,
  started_at timestamptz,
  vtt_url text,
  summary_md text,
  status text default 'pending'            -- pending|fetched|summarized|failed
);

create table transcript_segments (
  id uuid primary key default gen_random_uuid(),
  transcript_id uuid not null references meeting_transcripts(id) on delete cascade,
  speaker text,
  text text,
  start_ms int,
  end_ms int
);

-- RLS: enable on every table
alter table ms_connections        enable row level security;
alter table graph_subscriptions   enable row level security;
alter table calendar_events       enable row level security;
alter table meeting_transcripts   enable row level security;
alter table transcript_segments   enable row level security;

-- owner-only for connection/subscription/calendar
create policy own_ms_connections on ms_connections
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_graph_subscriptions on graph_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_calendar_events on calendar_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- transcripts: owner OR project member (shared visibility)
create policy read_meeting_transcripts on meeting_transcripts
  for select using (
    user_id = auth.uid()
    or project_id in (select project_id from project_members where user_id = auth.uid())
  );
create policy read_transcript_segments on transcript_segments
  for select using (
    transcript_id in (
      select id from meeting_transcripts
      where user_id = auth.uid()
         or project_id in (select project_id from project_members where user_id = auth.uid())
    )
  );

-- plus GRANTs to authenticated; writes to transcripts/segments happen
-- server-side via the secret key (BYPASSRLS), so no client write policy needed.
```
**Never expose `refresh_token_enc`** to the client — decrypt only inside Edge Functions using the secret key. (Align table writes with the §4.4 key model: privileged inserts use `sb_secret_...`.)

**Edge Functions:** `ms-oauth-callback` (token exchange), `graph-subscribe` / `graph-renew` (cron to renew ~3-day subscriptions), `graph-webhook` (validate `clientState`, fetch new transcript), `transcribe-summarize` (VTT → segments → AI summary via the read-only assistant), `link-event-to-project`, `calendar-sync` (pull `/me/calendarView`). Run privileged DB writes with `verify_jwt = false` + secret-key authorization; run user-facing reads with `verify_jwt = true` so RLS applies (per `supabase-keys.md`).

### 4.4 Secret names (Supabase Function secrets)

Set via `supabase secrets set NAME=value` — never in any `VITE_*` var (those are bundled into the client). Aligns with `supabase-keys.md`:
- `SUPABASE_SECRET_KEY` = **`sb_secret_...`** (replaces legacy `service_role`; used by Edge Functions for privileged writes / token decryption — the new key family is correct for all new work).
- `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_CLIENT_SECRET`, `MS_GRAPH_TENANT_ID`, `MS_GRAPH_REDIRECT_URI`.
- `GRAPH_WEBHOOK_CLIENT_STATE` (validate inbound notifications).
- `TOKEN_ENCRYPTION_KEY` (encrypt `refresh_token_enc` at rest).
- `AI_ASSISTANT_API_KEY` (summary/action-item extraction via the read-only assistant).
- Fallback path only: `AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION` (preferred), or `DEEPGRAM_API_KEY`.

Client `.env` stays: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY` (= **`sb_publishable_...`**, RLS-scoped, browser-safe). Enable **asymmetric JWT signing keys (RS256)** so Edge Functions verify the Entra→Supabase user JWT locally (prefer RS256 over ES256 per the known Edge gateway issue) — all per `supabase-keys.md`.

### 4.5 Work split — INTEG-OUTLOOK vs INTEG-TEAMS (no collision)

**Shared foundation (build once, agree on owner first):** the Entra OAuth consent flow + `ms-oauth-callback` Edge Function + the `ms_connections` table + token encryption/decryption helper. **Recommend INTEG-OUTLOOK owns this foundation** (it's needed first and is calendar/mail-centric), and INTEG-TEAMS consumes the stored tokens.

**INTEG-OUTLOOK owns:**
- Scopes `Calendars.Read`, `Mail.Read`; the shared OAuth flow + `ms_connections`.
- `calendar_events` table + `calendar-sync` / `link-event-to-project` Edge Functions (`/me/events`, `/me/calendarView`, `/me/messages`).
- **Outlook calendar panel on project pages** (the beat-Notion feature) + email search parity.
- The "match a calendar event's join URL → project" linking logic (writes `calendar_events.project_id`).

**INTEG-TEAMS owns:**
- Scopes `OnlineMeetingTranscript.Read.All`, `OnlineMeetings.Read`; (and, if tenant-wide, the application access policy with admin).
- `graph_subscriptions`, `meeting_transcripts`, `transcript_segments` tables.
- `graph-subscribe` / `graph-renew` (cron) + `graph-webhook` + `transcribe-summarize` Edge Functions: resolve meeting id from the event join URL (reads INTEG-OUTLOOK's `calendar_events`), fetch the `.vtt`, parse → segments, summarize via the read-only assistant.
- The **`/meet` meeting-notes page output**: rendering transcript / summary / action-item blocks (coordinate the block schema with PAGES) and "turn action items into tasks."
- The optional fallback browser recorder (flagged off).

**Contract between them:** INTEG-OUTLOOK populates `calendar_events` (incl. `join_web_url`, `project_id`); INTEG-TEAMS reads it to associate a transcript with the right project/page. Neither writes the other's tables. Both reuse the single `ms_connections` token store.

---

### Consolidated source list

All URLs are drawn from the cited research docs (`research/{obsidian,notion,affine,appflowy,anytype,supabase-keys}.md`); see those files for the full per-claim citations. Key references:
- Obsidian graph & linking: https://obsidian.md/help/plugins/graph · https://deepwiki.com/obsidianmd/obsidian-help/4.5-graph-view · https://deepwiki.com/obsidianmd/obsidian-help/4.2-internal-links-and-backlinks · https://codeculture.store/blogs/developer-culture/obsidian-graph-view-useful · https://help.obsidian.md/plugins/command-palette · https://github.com/vasturiano/react-force-graph
- Notion DB/blocks/meeting notes & MS Graph: https://www.notion.com/help/ai-meeting-notes · https://www.notion.com/help/intro-to-databases · https://www.notion.com/help/guides/using-database-views · https://www.notion.com/help/microsoft-outlook-ai-connector · https://learn.microsoft.com/en-us/graph/api/onlinemeeting-list-transcripts?view=graph-rest-1.0 · https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/meeting-transcripts/overview-transcripts · https://graphpermissions.merill.net/permission/OnlineMeetingTranscript.Read.All · https://www.sally.io/blog/notion-ai-meeting-notes-review
- AFFiNE / AppFlowy / Anytype patterns: https://affine.pro/blog/whats-new-affine-dec-update · https://affine.pro/blog/pages-linking-to-pages · https://www.opentechhub.io/appflowy/ · https://github.com/AppFlowy-IO/AppFlowy/discussions/1271 · https://doc.anytype.io/anytype-docs/getting-started/sets · https://doc.anytype.io/anytype-docs/getting-started/types
- Supabase keys/auth: https://supabase.com/docs/guides/api/api-keys · https://supabase.com/docs/guides/functions/auth · https://supabase.com/docs/guides/auth/signing-keys
