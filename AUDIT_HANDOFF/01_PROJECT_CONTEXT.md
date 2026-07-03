# Premier Project Hub — Project Context (read this first)

You have no memory of this project. This file is your ground truth. Read it fully
before touching anything. Then read `00_AUDIT_MISSION.md` for what you must do.

---

## 1. What the app is

**Premier Project Hub** — an internal web app for **Premier Brands of America**.
It is a work "home base": projects, tasks, pages/docs, planning, a creative
(art request) portal, calendar/timeline, an Obsidian-style knowledge graph, an
org chart, a memory/knowledge-graph feature, and a read-only AI assistant.
Auth is Microsoft Entra ID via Supabase Auth. It is a pilot / internal tool.

The intended emotional target of the design is **"Crimson Engineering"** —
Linear / Vercel / Raycast discipline (hairline borders, near-neutral carbon
surfaces, restrained motion, one saturated accent), anchored on Premier's own
crimson `#c10230` (hue ≈ 347°). Treat this as *current intent*, not as sacred —
the mission is to challenge and out-design it.

## 2. Where the code lives

- **GitHub repo:** `https://github.com/Premier-Brands-of-America/premier-hub-foundation`
  (org `Premier-Brands-of-America` — you must be a member with access; you may
  need to authorize the org's SSO after `gh auth login`).
- **This project IS that repo.** These handoff files live at `AUDIT_HANDOFF/`
  **inside** the repo, so if you can read this, you already have the code — you
  are at the repo root (or one level down). **All paths in these docs are
  relative to the repo root** (e.g. `src/App.tsx`, `supabase/functions/`). Do not
  look for any absolute `/Users/...` or `C:\...` path — there is none to find.
- If you do NOT have the repo yet, clone it:
  ```
  gh repo clone Premier-Brands-of-America/premier-hub-foundation
  cd premier-hub-foundation
  git checkout feat/premier-hub-revamp
  ```
- **Active branch:** `feat/premier-hub-revamp` (this is the one to audit/redesign).
  Other branches exist (`feat/v2`, `feat/dashboard`, `feat/graph`, `feat/pages`,
  `feat/integ-outlook`, `feat/integ-teams`, `main`) — do **not** assume they are
  current; confirm with `git branch` and `git log` before relying on any of them.
- On the Mac where this repo was authored, sibling folders `hub-dash`, `hub-graph`,
  `hub-pages`, `hub-outlook`, `hub-teams`, `hub-design` are **git worktrees** of
  those feature branches — on a fresh clone they simply won't exist, which is fine.
- Screenshots of the current UI are in the repo root: `phv2-dashboard.png`,
  `phv2-graph.png`, `phv2-login.png`, `phv2-page-editor.png`, `phv2-pages.png`,
  `phv2-pages-new.png`, `phv2-slash-menu.png`. **Look at these** for a fast read
  of the current visual state before you run anything.

## 3. Stack (locked — do not swap frameworks)

- React 18 + Vite 5 + TypeScript (strict)
- Tailwind CSS v3 + shadcn/ui (Radix primitives) + `lucide-react` icons
- Supabase (Lovable Cloud): Postgres + RLS + Auth + Edge Functions (Deno)
- TanStack Query for server state
- Fonts: Inter (variable) + JetBrains Mono (variable)
- `date-fns`, `cmdk` (command palette), `next-themes`
- Package manager: repo has both `bun.lockb` and `package-lock.json`. Scripts:
  `npm run dev` (Vite dev server, `http://localhost:5173`), `npm run build`,
  `npm run lint`, `npm run test` (vitest), `tsc --noEmit` for typecheck.

## 4. Routes / features (from `src/App.tsx`)

Core (all behind `ProtectedRoute`, many behind `FeatureRoute` flags):

| Route | Page | Notes |
|---|---|---|
| `/` | Dashboard (`Index.tsx`) | bento grid of widgets; `/dashboard` redirects here |
| `/tasks`, `/tasks/:id` | Tasks | "My Tasks" list + detail |
| `/planner` | Planner | Kanban-style planner — **flagged by user as mediocre** |
| `/pages`, `/pages/:id` | Pages | block/doc editor w/ slash menu, page tree — **flagged as mediocre** |
| `/timeline` | Timeline | calendar/timeline view — **flagged as mediocre** |
| `/projects` + `/assigned-`/`/owned-`/`/public-`/`/completed-projects` | Projects hub + lists | |
| `/projects/:id` | Project detail | |
| `/ai-assistant` | AI Assistant | **read-only** — never make it write |
| `/graph` | Knowledge graph | Obsidian-style; staff/designer/admin only |
| `/org` | Org chart | M365 people hierarchy |
| `/memory` | Memory / knowledge graph | pgvector-backed; admin |
| `/search` | Search results | |
| `/profile` | Profile | design-mode + preferences |
| `/admin`, `/admin/settings` | Admin tools + settings | admin |
| `/reports`, `/workload`, `/audit` | Reports / dept workload / audit log | admin |
| `/diagnostics`, `/debug/flags` | Diagnostics / feature flags | |
| **Art request portal** | `/requests`, `/requests/new{,/easy,/full-brief}`, `/requests/:id`, `/queue` | roles: requester/designer/admin. Known-fragile creation flow historically. |

Sidebar nav order: Dashboard, My Tasks, Planner, Pages, Timeline, Projects,
AI Assistant, Graph, Org, Memory, Diagnostics + a "workspace/portal" group
(Submit Art Request, My Requests, Queue, Department Workload, Reports) + admin
group (Admin Tools, Audit Log, Settings).

## 5. Design system (current)

- All color is via **semantic HSL tokens** in `src/index.css` (~243 CSS custom
  properties). Tailwind consumes them (`bg-primary`, `text-muted-foreground`,
  `border-border`, …). **Never hardcode colors** (`text-white`, `bg-[#hex]`,
  `bg-black`) — it breaks theming and violates project rules.
- Dark + light must both look right; components must not branch on theme.
- Design intent doc: `premier-hub-foundation/DESIGN_LANGUAGE.md` (the "contract").
  Also: `DESIGN_PROGRESS.md`, `GRAPH_REFERENCE.md`, `DECISIONS.md`, `HANDOFF.md`,
  `PLAN.md`, `V2_FEATURES_PROGRESS.md` in the repo root.
- Brand config centralized in `src/config/brand.ts` (Premier crimson).
- Keyboard: `⌘K` command palette, `⌘⇧D` toggle design mode.

## 6. Hard constraints (violating these breaks the app)

- **Entra ID via Supabase Auth only.** No local passwords. Localhost has a
  Preview/mock login. Do not add other auth.
- **RLS enforced.** Any new public-schema table needs explicit GRANTs + `WITH
  CHECK` on policies that touch privilege flags. Roles live in a `user_roles`
  table + `has_role()` security-definer — **never** store roles on `profiles`.
- **No backend/server code in the client repo.** All server logic (OAuth, MS
  Graph, transcription, memory extraction) lives in **Supabase Edge Functions**
  (`supabase/functions/*`: `ms-oauth-*`, `graph-*`, `mail-search`, `calendar-*`,
  `transcribe-summarize`, `transcript-action-items`, `memory-*`, `ai-assistant`,
  `sharepoint-provision`, …). 42 migrations in `supabase/migrations/`.
- **No `window.prompt` / `window.confirm`** anywhere — the preview runs in a
  sandboxed iframe where they fail silently. Use shadcn dialogs.
- **AI assistant stays read-only.**
- Never hardcode secrets — use Supabase secrets (see `KEYS_SETUP.md`).
- Form caps: titles ≤ 200 chars, descriptions ≤ 2000.
- Accessibility is pilot-ready (skip-to-main, focus rings, ARIA) — do not regress.

## 7. Known weak spots / history (verify, don't trust blindly)

- **Pages, Planner, Timeline/Calendar** are explicitly considered mediocre by the
  owner and are priority redesign targets.
- Notifications Bell in the header was historically a non-functional placeholder.
- A density toggle (`comfortable | compact`) is plumbed in the provider but not
  fully surfaced/consumed.
- The Art Request creation flow has broken before (often sandbox `prompt`/`confirm`
  or a broken mutation).
- Modern-mode styling was never audited on every route.

## 8. How to run it

From the repo root (the folder containing `package.json` and this `AUDIT_HANDOFF/`):

```bash
git status && git branch          # confirm you're on feat/premier-hub-revamp
npm install                       # or bun install
npm run dev                       # http://localhost:5173 (mock login on localhost)
npm run build && npx tsc --noEmit && npm run lint   # health check
```

Note: this repo ships its own design skill at `.claude/skills/claude-design-skill`
— use it for the redesign work.

Published (reference only): `https://premier-hub-foundation.lovable.app`
