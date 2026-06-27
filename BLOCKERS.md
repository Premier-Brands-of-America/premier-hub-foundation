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
