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
