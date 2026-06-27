# BLOCKERS — feat/premier-hub-revamp

(Anything that blocks a single task is logged here; the run continues.)

## Deferred to deploy / require infra (logged, not run — per safety rules)

These do NOT block local review; they require the documented deploy or an Entra
admin action the run is forbidden from performing.

1. **DB migration not pushed.** `supabase/migrations/20260627120000_planner_kanban.sql`
   (buckets, kanban task fields, comment mentions, request routing/justification
   columns, notification enrichment, ownership matrix) is written but NOT applied —
   `supabase db push` is a deploy step (no DB/infra access in this run). Until then,
   new columns/tables don't exist on the live DB, so the Planner/Kanban + comment
   mentions run on the **preview-demo data path** (localStorage) for review. Generated
   `src/integrations/supabase/types.ts` should be regenerated after the push.

2. **Graph calendar event creation — runtime test PENDING scope grant.** Built:
   `src/lib/outlookPrefill.ts` + `supabase/functions/calendar-create-event/`. Needs
   delegated `Calendars.ReadWrite` (and `OnlineMeetings.ReadWrite` for Teams links)
   added in Entra + admin consent. See `docs/GRAPH-PERMISSIONS.md`. App registration
   left untouched (Entra admin action). The Outlook web **deeplink** fallback works
   today with no scope change.

3. **Email + in-app notification dispatch.** Trigger logic is built and unit-tested
   (`src/lib/notificationTriggers.ts`) and the `notifications` table exists. Actual
   delivery (insert in-app rows from server context + send email) wires at deploy:
   email send needs the delegated **`Mail.Send`** Graph scope (app currently has
   `Mail.Read`) or a configured SMTP relay. Teams notifications stay behind a
   feature flag (`notifications.teams`, default off) — no webhook present.

4. **Art Lead + manager emails are config/env placeholders.** Real values go in
   `VITE_ART_LEAD_EMAIL`, `VITE_MANAGER_{JACLYN,MEGAN,DAN}_EMAIL` (see DECISIONS.md /
   `src/config/artOwnership.ts`). Fallbacks used in dev/preview.

5. **`npm run lint`** has 68 pre-existing errors (zero diff vs base; Deno edge-fn
   noise + no-explicit-any). Not a CI gate today; new code is tsc-clean.

6. **Skill `/plugin` marketplace flow** needs an interactive TTY (unavailable
   headless). Worked around with non-interactive `git clone`; all 10 obtained.
