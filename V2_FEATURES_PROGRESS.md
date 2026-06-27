# V2 Final Feature Batch — Progress

Unattended build on `feat/premier-hub-revamp`. Migrations written, NOT pushed.
Preview demo path keeps everything clickable. tsc + build kept green per feature.

---

## Foundation — pure resolvers + tests (2026-06-27 2:09pm EDT)
Added DB-agnostic logic the features build on, fully unit-tested (45 tests):
- `src/lib/contrast.ts` — WCAG AA ratio + nearest-passing-shade (Feature 2 guardrail).
- `src/lib/acl.ts` — row-level visibility resolver (Feature 5).
- `src/lib/orgChart.ts` — flat people → reports-to tree, cycle-safe (Feature 1).
- `src/lib/pageShare.ts` — per-person page access view/edit (Feature 6).

## Feature 4 — M365-only auth (verified) (2026-06-27 2:15pm EDT)
Documentation/verification only. Confirmed Entra OAuth is the only real sign-in
(`signInWithOAuth({provider:'azure'})`); no password/OTP/signup/magic-link anywhere
in `src/`. `PreviewLogin` strictly gated by `isPreviewEnvironment()`. Documented the
full auth model in DECISIONS.md; infra lock follow-up logged in BLOCKERS.md.

## Feature 2 — per-user color customization (2026-06-27 2:19pm EDT)
Text / highlight / background colors for BOTH light and dark themes, with curated
presets and a live WCAG AA contrast guardrail.
- `src/lib/colorPresets.ts` (+ test) — 6 presets (Premier, Ocean, Forest, Sunset,
  Grape, Monochrome); every preset's body text passes AA in both themes (asserted).
- `src/providers/DesignModeProvider.tsx` — loads/applies/persists `color_overrides`
  per theme. Channels map to tokens: text→`--foreground`, highlight→`--primary`+`--ring`,
  background→`--background`, applied as inline CSS vars over the token system (does not
  break tokens; unset channels fall back to defaults). Persists to
  `profiles.preferences.color_overrides` (real) / localStorage (preview/instant).
- `src/components/AppearanceColors.tsx` — Settings → Appearance panel: per-theme
  editor toggle, preset chips, native color pickers (hex↔HSL), live per-channel
  contrast badges, and an AA guardrail banner with "Use nearest passing shade" — an
  illegible body combo is never saved silently. Mounted in `ProfilePage` Appearance card.
- Migration `20260627140000_user_theme_prefs.sql` — documents/ensures the
  `preferences.color_overrides` shape (nested in existing JSONB; reuses profile RLS).
- **Preview:** fully working — pick colors / presets on /profile, see them apply live;
  contrast guardrail demonstrable by choosing a low-contrast text color.

## Feature 5 — ACL / row-level visibility (2026-06-27 2:28pm EDT)
Owner / project-lead / assignee / stakeholder / member + public; managers see their
direct reports' items (M365 hierarchy); admins see all; new items default to private.
- Migration `20260627150000_feature5_acl_visibility.sql` — adds `tasks.visibility`
  (default private), `is_manager_of(_user,_target)` (matches `manager_email`), rewrites
  `can_view_project` / `can_view_task` / `can_view_page` to add owner + manager-of-report
  rules (SECURITY DEFINER, EXISTS subqueries, no N+1; manager indexes added); enables RLS
  + SELECT/INSERT/UPDATE/DELETE policies on tasks.
- `src/lib/visibility.ts` (+ test) — row adapters over the tested `acl.ts`/`pageShare.ts`
  resolvers (project/task/page), mirroring the SQL rules.
- `src/lib/previewViewer.ts` + PreviewAuthContext — mirror the signed-in mock viewer to
  localStorage so the service layer can scope the demo path.
- `src/lib/aclDemo.ts` — preview demo dataset (5 projects, 4 tasks) demonstrating every
  rule; a synthetic direct report ("Riley Cho") always reports to the current viewer so
  the manager rule is observable. Re-seeds per signed-in user.
- `projectService` / `taskService` preview branches now seed + filter through the
  resolver; `createTask` + CreateTaskModal default to private; visibility toggle added to
  TaskDetailPanel (projects already had it).
- **Preview:** sign in as Standard vs Admin → the visible project/task set changes
  (admin sees all; standard sees own + public + stakeholder + direct-report items).

## Feature 6 — Pages sharing per-person (2026-06-27 2:33pm EDT)
Extends page visibility (private/department/public) with named per-person grants.
- Migration `20260627160000_feature6_page_shares.sql` — `page_shares` table
  (page_id, grantee_user_id, role view/edit, unique per page+grantee, indexed),
  `has_page_share()` / `can_edit_page()` helpers, `can_view_page()` rewritten to also
  honor shares, pages UPDATE policy now allows edit-grantees, page_shares RLS (owner/
  admin manage; grantee reads own).
- types: `PageShare` / `EnrichedPageShare` / `PageShareRole`; generated types.ts gains
  `page_shares` so the typed client stays green.
- `src/lib/directory.ts` — shared M365 people directory (preview mock + real query),
  reused by the picker and to resolve grant names.
- `pagesService` — `fetchPageShares` / `addPageShare` / `updatePageShareRole` /
  `removePageShare` (preview + real); preview pages now filter through `canViewPageRow`
  (with shares); `createPage` owns pages as the real viewer; demo seeds 4 pages + 2
  shares demonstrating owner / public / shared-to-you / hidden.
- hooks: `usePageShares` + `usePageShareMutations` in use-page.ts.
- `PageShareDialog` (people list + role selector + remove + directory picker) opened
  from a new "Share" button in `PageHeader`; StakeholderPicker gained a `triggerLabel`.
- **Preview:** open a page → Share → add people, set view/edit, remove; the
  "Shared with you: Q3 brief" demo page is visible only because it's shared to you.
