# SESSION HANDOFF — Premier Project Hub v2 build

**Written:** 2026-06-25, end of an iTerm2 session, to resume in a fresh tmux session with zero guesswork.
**Driver doc:** `LEAD_BRIEF.md` (repo parent dir) + `PLAN.md` (this repo) + `research/findings.md` (the build spec).

---

## 1. WHERE WE ARE

**Phase: P2 COMPLETE and MERGED. Next up = P3 (5 parallel build agents).**

Phases (per `PLAN.md`): P0 setup ✅ · P1 research ✅ · **P2 design-system ✅ (merged into feat/v2)** · **P3 parallel build ◀ NEXT** · P4 integrate · P5 art-workflow fix · P6 audit swarm · deliverable = draft PR.

Everything below is **committed**. Working trees are **clean** on every branch/worktree. `dist/` is gitignored.

---

## 2. GIT STATE (exact)

### Branches (last commit each)
| Branch | Last commit | Meaning |
|---|---|---|
| `main` | `cd03a98` | Untouched, = `origin/main`. Do NOT push here. |
| `feat/v2` | `bb30ce6` | **Integration branch.** Has P0 docs + P1 research + P2 design-system (merged). All future merges target this. |
| `feat/design-system` | `33e1f95` | P2 work. **Already merged into feat/v2** via `bb30ce6` (--no-ff). Checked out in worktree `hub-design`. Done. |

### Worktrees that ALREADY EXIST (⚠️ REUSE — do NOT `git worktree add` these again, it errors)
| Path | Branch | Status |
|---|---|---|
| `/Users/edwinmejia/Developer/PremierHubv3/premier-hub-foundation` | `feat/v2` | The LEAD's main repo. `node_modules` installed. |
| `/Users/edwinmejia/Developer/PremierHubv3/hub-design` | `feat/design-system` | P2 done + merged. Clean. `node_modules` present. Can be left as-is or pruned later (don't prune without need). |

### Worktrees NOT yet created (these are P3 — create them when starting P3)
`hub-dash`, `hub-graph`, `hub-pages`, `hub-outlook`, `hub-teams` — see §5 for exact commands.

### feat/v2 commit log (newest first)
```
bb30ce6 merge(P2): design-system — one revamped dark/light token system
33e1f95 feat(theme): surface dark/light + density toggles in shell
cdde223 feat(theme): refactor DesignModeProvider to theme + density
5682909 feat(theme): revamp token system to one dark+light design (Linear/Vercel/Raycast)
876a931 research(P1): synthesis findings.md + check off P1 (GATE cleared)
fe020c3 research(P1): app research docs + Supabase key-model investigation
854f080 docs: P0 — add HANDOFF brief and v2 build PLAN
cd03a98 Applied accent rail tints   ← original main HEAD
```

### Uncommitted
**None.** (Build artifacts in `dist/` are gitignored.)

---

## 3. PER-TEAMMATE STATUS (all finished, all committed, all idle)

| Teammate | Owned | State | Committed in |
|---|---|---|---|
| obsidian-researcher | `research/obsidian.md` | done, idle | `fe020c3` |
| notion-researcher | `research/notion.md` (Teams/Outlook/transcription deep) | done, idle | `fe020c3` |
| affine-researcher | `research/affine.md` | done, idle | `fe020c3` |
| appflowy-researcher | `research/appflowy.md` | done, idle | `fe020c3` |
| anytype-researcher | `research/anytype.md` | done, idle | `fe020c3` |
| supabase-keys-researcher | `research/supabase-keys.md` | done, idle | `fe020c3` |
| synthesis-researcher | `research/findings.md` | done, idle | `876a931` |
| design-system | `src/index.css`, `tailwind.config.ts`, `src/providers/DesignModeProvider.tsx`, `src/components/AppLayout.tsx`, `src/components/ui/sonner.tsx` | done, idle, **merged** | `5682909`,`cdde223`,`33e1f95` → merged `bb30ce6` |

**No teammate is mid-task.** In the iTerm2 session these were Agent-tool named teammates (= panes). The old panes are safe to close. A fresh tmux session starts with zero teammates — respawn as needed (§5).

---

## 4. FILES PRODUCED SO FAR (all on feat/v2)

- `PLAN.md` — phase checklist (P0–P2 checked off).
- `docs/HANDOFF.md` — original modern-UI handoff (current architecture, constraints).
- `docs/SESSION_HANDOFF.md` — this file.
- `research/{affine,anytype,appflowy,notion,obsidian,supabase-keys}.md` — 6 cited app/platform studies.
- `research/findings.md` — **THE BUILD SPEC.** §1 feature matrix · §2 ranked shortlist + out-of-scope · §3 per-agent UX patterns (a DESIGN-SYSTEM, b DASHBOARD, c GRAPH, d PAGES) · §4 Teams/Outlook/transcription on Edge Functions (engine pick, MS Graph data-flow, RLS schema, secret names, INTEG-OUTLOOK vs INTEG-TEAMS split).
- Design system (merged): rewritten `src/index.css`, `tailwind.config.ts`, refactored `DesignModeProvider.tsx`, `AppLayout.tsx` toggles, `ui/sonner.tsx`.

---

## 5. EXACT NEXT ACTIONS TO RESUME (in order)

> Orchestration model: spawn work as **named Agent-tool teammates** (they render as panes — tmux panes in the new session). Read-only swarms (P6) can also be a Workflow, but the user wants them visible, so prefer named teammates. **Pane mgmt:** spawn P3 in **batches of 3 then 2** (user wants ≤3 panes per row). Repo `cwd` = `premier-hub-foundation`.

### STEP A (optional, small, LEAD) — finish the theme migration
`src/pages/ProfilePage.tsx` (unowned by any agent) still renders a **vestigial Classic/Modern `ToggleGroup`** bound to deprecated `mode`/`setMode` (stuck on "Modern", no crash). Swap it to a Dark/Light + density control using the new provider API: `const {theme,setTheme,density,setDensity} = useDesignMode()`. Verify `tsc`+`build`, commit on feat/v2. *(Can also be deferred to P4.)*

### STEP B — P3: create 5 worktrees off feat/v2, clone node_modules, spawn 5 build teammates
Worktree commands (run from `premier-hub-foundation`; ⚠️ NOT `hub-design`, it exists):
```bash
git worktree add /Users/edwinmejia/Developer/PremierHubv3/hub-dash    -b feat/dashboard     feat/v2
git worktree add /Users/edwinmejia/Developer/PremierHubv3/hub-graph   -b feat/graph         feat/v2
git worktree add /Users/edwinmejia/Developer/PremierHubv3/hub-pages   -b feat/pages         feat/v2
git worktree add /Users/edwinmejia/Developer/PremierHubv3/hub-outlook -b feat/integ-outlook feat/v2
git worktree add /Users/edwinmejia/Developer/PremierHubv3/hub-teams   -b feat/integ-teams   feat/v2
# then for EACH new worktree (fast CoW clone of deps so tsc/build work):
cp -cR /Users/edwinmejia/Developer/PremierHubv3/premier-hub-foundation/node_modules <worktree>/node_modules
```

P3 teammate assignments (each consumes `research/findings.md`; each owns its dir; **none may edit `src/index.css`, `tailwind.config.ts`, `AppLayout.tsx` (P2-FROZEN), or `App.tsx` — routes for /graph, /pages, dashboard(/) already exist; flag the LEAD if a new route is truly needed**):
- **DASHBOARD** (`hub-dash` / `feat/dashboard`): editable card grid — findings §3b + §2 #7. New RLS table `dashboard_layouts(user_id, layout jsonb)` (+ migration). Card registry. Owns `src/pages/Index.tsx`, `src/components/Dashboard*.tsx`, new dir for the grid.
- **GRAPH** (`hub-graph` / `feat/graph`): Obsidian-style force graph — findings §3c + §2 #4. Uses existing `react-force-graph-2d`. Color/size by type+status. Local graph default. Owns `src/pages/Graph.tsx`, `src/components/graph/`.
- **PAGES** (`hub-pages` / `feat/pages`): block-editor polish, `/` slash menu, `[[ ]]` wikilinks + "Referenced by" backlinks — findings §3d + §2 #2,#3,#8. Owns `src/pages/Pages.tsx`, `src/components/pages/`. Coordinate the transcript/summary/action-item **block schema** with INTEG-TEAMS (findings §3d cross-agent note + §4.5).
- **INTEG-OUTLOOK** (`hub-outlook` / `feat/integ-outlook`): findings §4. **Owns the shared OAuth foundation** — `ms-oauth-callback` Edge Function + `ms_connections` table + token-encryption helper — PLUS `calendar_events` table, `calendar-sync`/`link-event-to-project` Edge Functions, and the Outlook calendar panel on project pages. Scopes `Calendars.Read`,`Mail.Read`. Edge Functions only; secrets per §4.4. New migration(s).
- **INTEG-TEAMS** (`hub-teams` / `feat/integ-teams`): findings §4. Owns `graph_subscriptions`,`meeting_transcripts`,`transcript_segments` tables + `graph-subscribe`/`graph-renew`/`graph-webhook`/`transcribe-summarize` Edge Functions. Scopes `OnlineMeetingTranscript.Read.All`,`OnlineMeetings.Read`. Engine = **Teams native transcript via MS Graph** (privacy-first), AI summary via the read-only assistant. Documents all env/secrets/functions in `research/integrations.md`. **Consumes INTEG-OUTLOOK's `ms_connections` + `calendar_events`** (see open question §6).

### STEP C — P4 integrate
Merge each P3 branch → `feat/v2` (`--no-ff`, per-agent history), resolve conflicts, then `npx tsc --noEmit` + `npm run build` + `npm run lint` clean. **Migration ordering:** ensure INTEG-OUTLOOK's `ms_connections` migration timestamp precedes INTEG-TEAMS's tables that FK to it.

### STEP D — P5 art-workflow fix (LEAD)
"Art Workflow breaks when creating a request." **NOT `window.prompt`** (already removed from `src/` — verified). Likely a broken mutation / RLS INSERT `WITH CHECK` / zod validation / enum/default mismatch. Trace `src/pages/portal/{SubmitRequest,EasyRequest,FullBriefRequest}.tsx` → `src/components/request-form/*` → the insert mutation (`src/services`/`src/hooks`) → the art-request table + its RLS. Reproduce, root-cause, minimal fix (no rewrite). Use systematic-debugging.

### STEP E — P6 audit swarm
Create read-only reviewer agent defs in `.claude/agents/` (tools: Read/Grep/Glob/Bash-for-build-only): `security-reviewer`, `design-reviewer`, `usability-reviewer`, `regression-reviewer`. Spawn all 4 vs `feat/v2` → each writes `audit/<name>.md` (severity-ranked). Triage → fix-task teammates for blockers → re-run auditor until clean. (`audit/` dir already exists, empty.)

### STEP F — deliverable
- Task #8: create `.env` template (user fills in) + `KEYS_SETUP.md` step-by-step guide. Reflect `research/supabase-keys.md`: client `.env` uses `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`(=`sb_publishable_…`); Edge Functions use `SUPABASE_SECRET_KEY`(=`sb_secret_…`) + `MS_GRAPH_*` etc. via `supabase secrets set` (never `VITE_`). Full secret list in findings §4.4.
- Push `feat/v2` to origin and open a **DRAFT PR** (`feat/v2` → `main`) summarizing changes grouped by agent + audit summary. **Never push to main.**

---

## 6. DECISIONS MADE / OPEN QUESTIONS

**Decisions (user-confirmed, 2026-06-25):**
- **Run autonomously**, do not pause between phases (only stop for destructive git ops + final PR).
- **Delivery = push feat/v2 + open DRAFT PR** (feat/v2 → main). Never push main.
- **Credentials:** user supplies Supabase + Teams + Outlook keys. LEAD must produce `.env` template + `KEYS_SETUP.md` (task #8).
- **Supabase keys:** legacy anon/service_role JWT keys are being retired (new projects lose them Nov 1 2025; full removal late 2026) → use new `sb_publishable_`/`sb_secret_` keys (see `research/supabase-keys.md`).
- **Transcription engine:** Teams-native transcript via MS Graph (privacy-first); Azure Speech / faster-whisper / Deepgram only as flagged fallbacks (findings §4.1).
- **/goal slash command does NOT exist** in this harness — goal captured in PLAN.md instead.
- **Harness:** teammates = named Agent-tool spawns (panes). `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set. iTerm2 had no "arrange evenly"/grid command; tmux handles tiling natively — pane-layout worries mostly moot in tmux. Keep P3 spawns to ≤3 concurrent if the user still wants ≤3/row.

**OPEN QUESTION the user may need to weigh in on (or LEAD decides):**
- **INTEG-TEAMS ⟶ INTEG-OUTLOOK dependency.** Both branch from feat/v2 independently, but INTEG-TEAMS consumes INTEG-OUTLOOK's `ms_connections`/`calendar_events`. **Recommended approach (no blocking):** both code against the EXACT schema in findings §4.3 (it's fully specified); each writes its own migration for its own tables; INTEG-TEAMS treats `ms_connections`/`calendar_events` as a documented contract (server-side SQL refs, so client TS won't break). Reconcile FK + migration ordering at P4 merge (Outlook's foundation migration must apply first). Alternative if conflicts worry you: build+merge INTEG-OUTLOOK first, then spawn INTEG-TEAMS off the updated feat/v2.

---

## 7. ⚠️ DO NOT REDO (will error or duplicate)

- ❌ Do NOT `git branch feat/v2` — exists (`bb30ce6`).
- ❌ Do NOT `git worktree add … hub-design` — exists (`feat/design-system`).
- ❌ Do NOT re-run P1 research or P2 design-system — done + committed + merged.
- ❌ Do NOT re-create `feat/design-system` or re-merge it — already in feat/v2.
- ❌ Do NOT build a second ⌘K palette — `src/components/search/GlobalCommandPalette.tsx` exists and is mounted on ⌘K (P2 reused it).
- ❌ Do NOT edit `src/index.css` / `tailwind.config.ts` / `AppLayout.tsx` in P3 — P2-frozen (LEAD-only).
- ✅ DO reuse existing worktrees; only CREATE the 5 P3 worktrees listed in §5.
- ℹ️ Memory file: `~/.claude/projects/-Users-edwinmejia-Developer-PremierHubv3/memory/premierhub-v2-build.md` records the key decisions.
