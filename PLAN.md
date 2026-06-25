# Premier Project Hub v2 — Build Plan

> Coordination doc for the phased agent team. The LEAD gates phases and merges; build
> agents read/update their own checkboxes. Integration branch: **`feat/v2`** (off `main`).

## GOAL

Ship a revamped Premier Project Hub v2 — brutally good, cutting-edge dark/light UI;
editable dashboard; Obsidian-style graph; MS Teams + Outlook integration with meeting
transcription (Notion-style) — **WITHOUT breaking the existing premise** (data model,
routes, projects/tasks/pages workflow, Entra ID auth, RLS, read-only AI assistant).

> Note: the brief's `/goal` slash command is not available in this harness; the goal is
> captured here in `PLAN.md` instead (durable + readable by every agent).

## CURRENT APP PREMISE (what must NOT break)

Internal pilot for **Premier Brands of America** ("Premier Project Hub" / Art Request Portal).

- **Stack:** React 18 + Vite 5 + TS (strict) + Tailwind v3 + shadcn + Supabase + TanStack Query.
- **Auth:** Microsoft Entra (Azure AD) SSO **via Supabase Auth only**. First sign-in →
  `handle_new_user()` → `profiles` row (default role `requester`). Roles live in
  `user_roles` + `has_role()` security-definer — never on `profiles`.
- **Authz:** RLS enforced on all public tables; route guards via `ProtectedRoute` +
  `requireRole` + `FeatureRoute` (feature flags).
- **Routes (must all keep working):** `/` (Dashboard), `/tasks`, `/assigned-projects`,
  `/owned-projects`, `/public-projects`, `/completed-projects`, `/ai-assistant`, `/admin`,
  `/admin/settings`, `/profile`, `/diagnostics`, `/debug/flags`, `/dashboard`→`/`,
  `/requests*` (new/easy/full-brief/:id/list), `/queue`, `/workload`, `/reports`,
  `/audit`, `/pages` + `/pages/:id`, `/timeline`, `/graph`, `/search`, `/403`,
  `/feature-off`, `*`.
- **Core workflow:** projects ↔ tasks ↔ pages (block editor) + art-request portal
  (SubmitRequest / EasyRequest / FullBriefRequest / RequestDetail / MyRequests / Queue /
  Workload / Reports / AuditLog).
- **AI assistant:** read-only (`supabase/functions/ai-assistant`). Stays read-only.
- **Existing edge functions:** `ai-assistant`, `sharepoint-provision` (MS Graph precedent —
  reuse its OAuth/secret pattern for Outlook/Teams).
- **Theme today:** dual Classic/Modern via `data-design` attribute + `DesignModeProvider`
  (`phv2:design-prefs` localStorage + `profiles.preferences` JSONB). **v2 removes Classic**
  and replaces both with ONE revamped dark/light system.
- **24 migrations** already applied; `window.prompt/confirm` already fully removed from `src/`.

## HARD CONSTRAINTS (enforced on every agent)

- Stack locked — no framework swaps. TS strict.
- Entra ID via Supabase Auth only. RLS enforced; new public tables → explicit GRANTs +
  `WITH CHECK` on any policy touching privilege flags.
- NO server/backend code in client repo — all server logic = **Supabase Edge Functions only**.
- NO hardcoded colors (`text-white`, `bg-[#hex]`, `bg-black`). Color via semantic HSL tokens
  in `src/index.css`.
- NO `window.prompt` / `window.confirm` — use shadcn dialogs.
- Never hardcode secrets — Supabase secrets; report exact secret names + where to set values.
- PRESERVE the premise (workflow + data + auth + RLS). Classic theme is REMOVED, not preserved.
- **Domain separation is non-negotiable** — one owner per file/dir. `src/index.css` owned by
  the design-system agent in P2, then frozen except via the LEAD.

---

## PHASE CHECKLIST

### P0 — Goal + Context  ✅
- [x] Capture goal (in this file)
- [x] Create integration branch `feat/v2` from `main`
- [x] Copy handoff → `docs/HANDOFF.md`; read it fully
- [x] Read repo structure (package.json, src tree, supabase)
- [x] Write `PLAN.md` (this file)
- [x] **GATE:** report plan + roster → user confirmed (autonomous run; draft-PR delivery)

### P1 — Research (parallel, read-only, no worktrees; each owns ONE file)  ✅
- [x] `research/affine.md`    (affine-researcher)
- [x] `research/appflowy.md`  (appflowy-researcher)
- [x] `research/obsidian.md`  (obsidian-researcher)
- [x] `research/anytype.md`   (anytype-researcher)
- [x] `research/notion.md`    (notion-researcher — Teams + Outlook + transcription deep ✓)
- [x] `research/supabase-keys.md` (added per user: new sb_publishable_/sb_secret_ keys; anon legacy)
- [x] commit all app files (commit fe020c3)
- [x] `research/findings.md`  (synthesis-researcher: matrix, ranked shortlist, per-agent UX
      patterns, Teams/Outlook/transcription on Edge Functions + RLS + secret names + work split)
- [x] **GATE:** `findings.md` committed before P2/P3 choices lock ✓

### P2 — Design System (solo)
- [ ] worktree `hub-design` (`feat/design-system` off `feat/v2`)
- [ ] ONE revamped dark+light system, semantic HSL tokens; remove dead Classic tokens
- [ ] persist per-user (`profiles.preferences` + `phv2:design-prefs`); toggle in profile menu + ⌘⇧D
- [ ] adopt `findings.md` UX patterns
- [ ] owns `src/index.css` + `tailwind.config.ts` + theme provider
- [ ] **GATE:** merge `feat/design-system` → `feat/v2` BEFORE P3 starts

### P3 — Parallel build (5 agents, each own worktree + dir; consume P2 tokens; never edit index.css)
- [ ] **DASHBOARD** (`hub-dash`, `feat/dashboard`): editable card system (add/remove/reorder/drag),
      card registry + layout-state table (RLS), persisted per-user
- [ ] **GRAPH** (`hub-graph`, `feat/graph`): Obsidian-style graph of pages/projects/tasks, own route
- [ ] **PAGES** (`hub-pages`, `feat/pages`): block-editor / pages polish per `findings.md`, own dir
- [ ] **INTEG-OUTLOOK** (`hub-outlook`, `feat/integ-outlook`): MS Graph OAuth (reuse Entra app),
      Outlook calendar/email surfaced Notion-style; server-side tokens; edge functions only; RLS tables
- [ ] **INTEG-TEAMS** (`hub-teams`, `feat/integ-teams`): Teams connectivity + meeting transcription
      pipeline (engine per `findings.md`); RLS transcripts linked to pages/projects; edge functions only;
      document env/secrets/functions in `research/integrations.md`

### P4 — Integrate
- [ ] review + merge each P3 branch → `feat/v2`, resolve conflicts
- [ ] `vite build` + `tsc --noEmit` + `eslint .` clean; fix integration breaks

### P5 — Art-Workflow fix (last)
- [ ] reproduce "create request breaks"; root-cause (NOT window.prompt — already removed;
      likely a broken mutation / RLS / validation path); minimal fix, no rewrite

### P6 — Audit swarm (parallel, read-only)
- [ ] create read-only agent defs in `.claude/agents/` (Read/Grep/Glob/Bash-only):
      security-reviewer, design-reviewer, usability-reviewer, regression-reviewer
- [ ] run all 4 vs `feat/v2`, each → `audit/<name>.md` (severity-ranked)
- [ ] triage → fix-task agents for blockers → re-run auditor until clean

### DELIVERABLE
- [ ] `feat/v2` builds clean; all original workflows preserved; revamped UI + editable
      dashboard + graph + Teams/Outlook + transcription; art workflow fixed; audits passed
- [ ] open PR (changes grouped by agent + audit summary). Do NOT push to main.
