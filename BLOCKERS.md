# BLOCKERS — feat/premier-hub-revamp

## Memory knowledge graph ("graphify in-app") — db push + deploy functions
The full KG system is written but NOT pushed/deployed (see `MEMORY_KG.md` for the
architecture + copy-paste commands). To go live, Edwin must:
- `supabase db push` — applies `20260701180000_memory_kg.sql` (pgvector extension +
  `memory_concepts`, `memory_embeddings`, `entity_relations.edge_kind/confidence/rationale`,
  `memory_access_grants` + `can_view_memory`, append-only `memory_access_log`, and the
  `get_memory_graph` / `memory_god_nodes` / `memory_surprising_edges` / `match_memory_embeddings` RPCs).
- `supabase functions deploy memory-extract memory-search memory-wiki ai-assistant`
  (`ai-assistant` was edited to inject semantic RAG; `config.toml` registers the 3 new fns).
- Backfill the graph: click **Rebuild memory** on `/memory` (admin), or POST
  `{"backfill":true,"limit":50}` to `memory-extract` with the `SUPABASE_SECRET_KEY`.
- Secrets: reuses existing `AI_ASSISTANT_API_KEY` / `AI_GATEWAY_URL` / `AI_MODEL` +
  `SUPABASE_URL/ANON_KEY/SECRET_KEY`; `gte-small` embeddings need no key.
Until pushed, `/memory` and the AI RAG path work in **preview** (demo knowledge
graph + graceful RPC fallbacks); in production the graph is empty until backfilled.


## Art request assignment — email to UNREGISTERED managers (needs Graph Mail.Send)
Migration `20260701155155_seed_art_users.sql` + the `assign_manager_and_notify`
DB trigger set `assignee_id` and insert an in-app notification **only when the
routed manager's email matches a registered `profiles` row**. Today only Dan De
Lello (ddelello@premier-brands.com) is registered, so:
- Jaclyn Baum (jbaum@premier-brands.com) and Megan Oettinger
  (moettinger@premier-brands.com) are seeded into `org_directory` (so they show
  in the Org Chart) but have **no auth/profile row** → they cannot be an
  `assignee_id` (FK → profiles) and get no in-app notification.
- ACTION: build a Graph **Mail.Send** edge-function path to email requests to
  managers who are not yet app users (until they register). The client already
  stores `metadata.manager_email` / `notify_to` / `notify_cc` on each request,
  so the email path has everything it needs.
- Also: `supabase db push` is required to apply `20260701155155_seed_art_users.sql`
  (relaxes org_directory.user_id NOT NULL, adds full_name, adds the trigger).

## sharepoint-provision — redeploy + set app-only secrets
`supabase/functions/sharepoint-provision/index.ts` was edited (NOT deployed) to
return CORS-valid 500s with the real error message and to list which secrets are
missing. For provisioning to actually work, Edwin must:
- `supabase functions deploy sharepoint-provision`
- Set the app-only secrets on the function:
  `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `SP_DRIVE_ID`
  (and optionally `SP_ROOT_FOLDER`, which defaults to "ArtRequests").
Until then the function returns a clear "Missing secret(s): …" 500 so the UI
shows exactly what infra is pending.

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

## Break-glass admin access — migration must be pushed by the owner (2026-07-01)
- **New migration `supabase/migrations/20260701140934_breakglass_admin_access.sql` is written but
  NOT pushed.** Run `supabase db push` (owner) to apply it. It is idempotent
  (create-or-replace / if-not-exists / drop-policy-if-exists) and touches no data.
- **This changes admin visibility in production.** After the push, admins **no longer passively
  see** other users' private projects / tasks / pages (nor silently edit/delete them). To
  troubleshoot, an admin must request time-boxed access (default 60 min) via the break-glass panel
  — which is written to the Audit Log and notifies the item's owner. Communicate this behavior
  change before pushing; any support workflow that relied on passive admin visibility must now go
  through the grant flow.
- **Notification deep-links** point at `/projects/:id`, `/tasks/:id`, `/pages/:id` (routes now
  exist). A genuinely missing/forbidden item shows the break-glass panel (admins) or redirects to
  /403 (everyone else).
- **Intentionally NOT changed:** the shared Art-Request queue and admin/config tables (profiles,
  feature flags, departments, roles, `audit_log`, `org_directory`) — admins keep full access there.

## Directory union (org_directory ∪ profiles) — assigning to unregistered people (2026-07-01)
- `fetchDirectory()` now unions the M365 `org_directory` cache with registered `profiles`
  (deduped by lower(email), profiles preferred) so unregistered staff appear in pickers and
  in Profile → Organization (manager + direct reports) before they ever sign in.
- **Expected limitation:** sharing/assigning to a directory-only (not-yet-registered) person
  cannot create a real `assignee_id` or notification — there is no auth user yet. Those
  people have `user_id = null` in the directory. The assignee/notification link resolves
  automatically the first time they sign in (email match against `profiles`). The Planner
  assignee/@mention picker intentionally excludes null-user_id people for this reason.

## Page create — real error now surfaced; root cause not reproducible statically (2026-07-01)
- `Pages.tsx` now shows the true Supabase/PostgrestError via `getErrorMessage()` instead of the
  generic "Failed to create page". Static review of the create path found NO concrete bug:
  the client calls `rpc('create_page', { p_title, p_parent_id (omitted→NULL), p_visibility })`
  with param names matching the SECURITY INVOKER RPC; `visibility` defaults to `'private'`
  (in the CHECK set); the INSERT policy `owner_id = auth.uid()` is satisfied; the
  `extract_page_links` BEFORE-INSERT trigger and the generated `search_vector` column are both
  harmless on an empty body.
- **If it still fails in production**, it is likely env-specific (migration not applied, RPC
  missing, or `auth.uid()` null on an expired session). The surfaced toast will now reveal the
  exact Postgres message — please paste it and we can pinpoint the cause.
