# BLOCKERS — feat/premier-hub-revamp

## Avatar/icon — deploy follow-ups (non-blocking; preview works without them)

The avatar/icon system works end-to-end in the running preview using deterministic
DiceBear defaults (seeded by entity id) plus client-side data-URI uploads, so nothing
here blocks the design work. These are the wiring tasks to finish once the DB/Storage
is available on a real deploy:

1. **User photo upload → Supabase Storage.** `AvatarPicker` (people) resizes an
   uploaded image to a square JPEG **data-URL client-side** and hands it back via
   `onChange`. For production this should instead upload the blob to a Supabase
   Storage bucket (e.g. `avatars/`) and persist the public URL to
   `profiles.avatar_url` (the column already exists in
   `src/integrations/supabase/types.ts`). Add the bucket + RLS policy and swap the
   data-URL for the uploaded URL. Until then the data-URL works fine in preview.

2. **Project/Task `icon` column → DB push.** Migration
   `supabase/migrations/20260627130000_entity_icons.sql` adds `projects.icon` and
   `tasks.icon` (text). It is written but NOT pushed (we never run migrations from
   here). Preview renders defaults via the demo-data path, so it's visible without the
   push. Run the migration on deploy so chosen icons persist.

3. **Graph RPC metadata.** When persisting real avatars/icons, the graph RPC can
   include `avatar_url` / `icon` in each node's `metadata` so the constellation shows
   the chosen image instead of the seeded default. The canvas already reads
   `metadata.avatar_url` / `metadata.icon` if present.

## v2 final feature batch — deploy/access follow-ups (non-blocking)

All seven features work in the running preview via the demo-data path. These are the
owner/infra actions needed to make them live against real Supabase/Graph. None block
review.

### Migrations to push (written, NOT pushed — `supabase db push` on deploy)
- `20260627140000_user_theme_prefs.sql` — Feature 2 (documents preferences.color_overrides).
- `20260627150000_feature5_acl_visibility.sql` — Feature 5: tasks.visibility,
  is_manager_of(), manager-aware can_view_project/task/page, tasks RLS.
- `20260627160000_feature6_page_shares.sql` — Feature 6: page_shares + RLS + can_edit_page.
- `20260627170000_project_documents.sql` — Feature 3: project_documents table + bucket + RLS.
- (Feature 1) `*_org_directory.sql`, `*_graph_org_rpc.sql`, profiles.office_location.

### Storage
- **Feature 3 — `project-documents` bucket.** Created in the migration above. In preview
  uploads are kept as inline data-URLs (no Storage needed). On deploy, run the migration
  so the bucket + RLS exist; `projectDocuments.ts` then uploads real blobs + signs URLs.

### Microsoft Graph (Feature 1) — scopes to grant (owner/admin in Entra)
- Delegated/app scopes for the org directory: `User.Read.All` (or `User.Read` +
  `Directory.Read.All`) to read jobTitle/department/officeLocation/manager/directReports.
  Exact deltas in `docs/GRAPH-PERMISSIONS.md`. Do NOT modify the app registration from
  here — owner grants admin consent. The `graph-user-directory` edge fn + `org_directory`
  table are written and run against these once consented; preview uses a seeded demo org.

### Auth (Feature 4)
- Keep the Supabase Auth providers locked to **Azure only** (no email/password,
  magic-link, or signup in the Supabase console). Verified in code; this is an infra lock.

### Microsoft 365 connections on the Profile page (v2 final polish, 2026-06-28)
- The Profile → "Connections / Integrations" section connects Outlook / Teams /
  SharePoint / OneDrive via the existing MS-Graph OAuth foundation (`ms-oauth-start` /
  callback edge fns + the `ms_connections` token store, migration
  `20260601110000_ms_oauth_calendar.sql`). In **preview** connect/disconnect is simulated
  via localStorage (`demoConnectionsStore`) so the UI + first-time onboarding are clickable.
- **Deploy-gated (owner/admin in Entra):** the real OAuth consent flow needs the app
  registration to grant the relevant delegated scopes per service (Calendars.ReadWrite,
  OnlineMeetings/Chat for Teams transcripts, Sites.Selected/Files.Read for SharePoint &
  OneDrive). Wiring the Connect button to `ms-oauth-start` + reading real `ms_connections`
  rows happens once consented. The non-preview Connect button is rendered disabled with an
  "Available after deployment" hint until then.

## Production real-data audit & fix (2026-07-01)

See `REAL_DATA_AUDIT.md` for the full surface-by-surface audit. The client is now
wired to read real data in production for the calendar card, Profile org info, and the
Planner. These owner/infra items must land for that real data to actually populate:

### Migrations to push (written, NOT pushed — owner runs `supabase db push`)
- **`20260627180000_feature1_org_directory.sql`** — REQUIRED for the Org Chart + Profile
  org info. Adds `org_directory`, `profiles.office_location`, and `get_org_chart_data()`.
  Until pushed: `/org` falls back to the network graph and the Profile Organization card
  shows "—" for synced fields. The client already reads these correctly once present.
- **`20260627120000_planner_kanban.sql`** — REQUIRED for the Planner. Adds
  `project_buckets` + the kanban columns on `tasks` (`bucket_id`, `position`, `priority`,
  `assignee_id`, `checklist`, …). Until pushed, `usePlannerBoardSupabase` queries error and
  the board renders empty (no crash); preview is unaffected.

### Data population step (NOT just a migration)
- **Run "Sync Microsoft 365 directory"** (Profile page, admin-only → `graph-user-directory`
  edge fn) at least once after the feature1 migration is pushed. This backfills
  `profiles.title/department/office_location/manager_email` + `org_directory` from Graph.
  This is the step that was previously missing entirely — nothing in the UI ever invoked
  `graph-user-directory`, which is why the Org Chart and Profile were empty even with M365
  connected. Requires `User.Read.All` + `Directory.Read.All` admin consent (already granted).

### Known partials (non-blocking)
- **`tasks.status` enum is `active|complete` only** (the kanban migration did not extend it).
  The Planner's `not_started`/`in_progress`/`completed` collapse to `active`/`complete` on
  write and are re-derived on read (via `percent_complete`). A future migration could add a
  richer kanban status enum for exact round-tripping.
- **Planner card comments/attachments** load empty from the Supabase controller for now;
  comment persistence to `task_updates`/`project_updates` (with `mentioned_user_ids`) is a
  follow-up. The @mention parsing is already unit-tested.
- **Calendar week card** relies on the `calendar-sync` edge fn + `ms_connections` token; it
  auto-syncs on connect. Recurrence/timezone handling is per `calendar-sync` (−7d…+30d window).
- **Planner RLS.** Board reads require `can_view_project`; bucket/task creates & moves require
  `is_project_stakeholder(project_id)` (or admin). New planner cards are inserted with
  `user_id = auth.uid()` to satisfy the base `tasks` INSERT policy; note the base `tasks`
  DELETE policy is still owner-only, so a stakeholder deleting another user's card will get a
  toast error until a project-scoped DELETE policy is added. Non-stakeholders see empty boards
  by design.
