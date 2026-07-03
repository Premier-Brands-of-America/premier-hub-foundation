# MISSION — Full Audit + 100% Redesign of Premier Project Hub

Read `01_PROJECT_CONTEXT.md` first. Then execute this mission.

You are a senior product designer + staff engineer brought in with **zero
attachment** to what exists. **Default assumption: everything here is bad until
proven otherwise** — the copy, the cards, the dashboards, the Pages editor, the
Planner, the Timeline/Calendar, the empty states, the information architecture,
the security posture. All of it. Your job is not to polish. Your job is to
**re-conceive this app so a Premier employee *wants* to live in it all day** —
the first tab they open, the place they check their tasks, their insights, their
work — and to make the redesign **brutally good. Surprise me. I want to be
floored.** "Good enough" is a failure condition.

Nothing in the current app is off-limits to redesign except the **hard
constraints** in `01_PROJECT_CONTEXT.md §6` (auth, RLS, no client backend, no
`window.prompt`, read-only AI, no hardcoded colors, locked stack). Preserve the
*premise* — the data model, routes, and workflows (projects → tasks → pages,
Entra auth, art portal). Do **not** preserve the current look, copy, or layout.

---

## Phase 0 — Understand (no code yet)

1. Confirm branch/state (`git branch`, `git log --oneline -15`). Read the design
   docs in the repo root (`DESIGN_LANGUAGE.md`, `DECISIONS.md`, `HANDOFF.md`,
   `V2_FEATURES_PROGRESS.md`, `PLAN.md`).
2. Look at every screenshot (`phv2-*.png`) and then **run the app** (§8) and
   click through *every* route. Take your own screenshots of each screen.
3. Build a **feature inventory**: one row per feature/route — what it does, who
   uses it, how it looks today, how it feels to use.

## Phase 1 — Interrogate every feature (functional + UX audit)

Go feature by feature, **independently**, and question everything. For each:

- **Purpose:** Why does this exist? Would a user notice if it vanished?
- **Function:** What's broken, confusing, slow, or two-clicks-too-many? Repro any
  bug. Check empty states, error states, loading states, mobile.
- **Copy:** Is the text generic, robotic, or unclear? Rewrite it to be sharp,
  human, and specific. Assume the current copy is a placeholder.
- **Redundancy / gaps:** Does it overlap another feature? What's missing?
- **Verdict:** keep-as-is / redesign / merge / cut — with a reason.

Cover at minimum: Dashboard, My Tasks, **Planner**, **Pages**, **Timeline/
Calendar**, Projects (hub + lists + detail), AI Assistant, Graph, Org, Memory,
Search, Profile, Admin/Settings, Reports, Workload, Audit, and the whole **Art
Request portal**. Do not skip the "boring" admin screens.

## Phase 2 — What's missing (make it a place people live)

Propose the features/moments that would make this the app users keep open all
day. Think: a genuinely useful **"my day" / home**, actionable **insights &
analytics** (not vanity charts — see the `dataviz` skill), notifications that
matter, quick-capture, a real command palette, cross-linking between
tasks/pages/projects, focus/agenda views, keyboard-first flow, streaks/nudges,
weekly review, calendar that fuses tasks + meetings. Rank by
impact × effort. Say what you'd build first and why.

## Phase 3 — Visual audit + the 100% redesign

This is the headline deliverable. **Redesign everything.**

- Do a **visual audit** of the current UI: typography, spacing, hierarchy, color
  use, density, motion, iconography, consistency, dark/light parity. Name what's
  mediocre and *why* (specifically — "the dashboard cards are flat gray boxes with
  no hierarchy," not "could be better").
- Then produce a **new, distinctive design direction** — not a reskin. It can
  evolve or replace "Crimson Engineering." Push it. I want a point of view:
  a defined type system, spacing/rhythm, a real color system in semantic tokens,
  signature components, motion language, and an opinionated layout. Reference the
  `frontend-design`, `ui-ux-pro-max`, `design-system`, and `dataviz` skills.
- **Redesign these to 100%, they are considered mediocre today and must not
  survive in their current form:**
  - **Pages** — the doc/block editor, slash menu, page tree, page canvas.
  - **Planner** — the whole planning surface.
  - **Timeline / Calendar** — the whole time view.
  - **Dashboard** — cards, layout, what it surfaces.
- Everything else (sidebar, header, tables, forms, empty states, badges, the
  login screen, the copy) is in scope too.
- **Show, don't just tell.** Produce concrete mockups: build real
  components/screens in the app (behind the locked stack), and/or standalone HTML
  mockups I can open. At least one full "hero" screen must be *finished* enough
  to make me say "yes, that." Deliver 2–3 distinct directions for the hero screen
  so I can choose, then go deep on the winner.

## Phase 4 — Security & correctness audit

Assume it's insecure until proven otherwise. Check: RLS coverage + `WITH CHECK`
on privilege policies, GRANTs on new tables, no secrets in the client, OAuth
tokens handled server-side only (edge functions), no client-side-only privilege
checks, edge-function authz, no `window.prompt`/`confirm` (`rg
"window\.(prompt|confirm)" src/`), build + `tsc --noEmit` + lint clean, and that
every route still works after changes. Report severity-ranked findings.

---

## Working rules

- **Question everything, including me.** If a current decision is wrong, say so
  with a reason. If you find a better path than this brief, propose it.
- Use the available **skills** — `frontend-design`, `ui-ux-pro-max`,
  `design-system`, `dataviz`, `brainstorming` (before designing), and the audit/
  security skills. Don't design from memory; invoke them.
- Respect the hard constraints (§6). Everything else is fair game.
- Don't silently make sweeping edits to the live branch first. **Deliver the
  audit + redesign proposal + mockups first, let me react, then build.** Work on
  a branch, never on `main`; ask before any destructive git op.
- Be specific and brutal. Vague praise is useless. I want the truth about what's
  wrong and a design that surprises me.

## Deliverables

1. `AUDIT/feature-audit.md` — per-feature interrogation with verdicts.
2. `AUDIT/missing-features.md` — ranked roadmap to "app people live in."
3. `AUDIT/visual-audit.md` — what's mediocre and why, with screenshots.
4. `AUDIT/redesign-direction.md` — the new design system/point of view + tokens.
5. **Mockups** — 2–3 hero-screen directions + finished redesigns of Pages,
   Planner, Timeline/Calendar, Dashboard (in-app components and/or HTML).
6. `AUDIT/security.md` — severity-ranked findings.
7. A short **executive summary** at the top of a `AUDIT/README.md`: the 5 things
   that matter most and what you'd do first.

**Start with Phase 0 now. After the feature inventory + visual audit, stop and
show me before you build the redesign.**
