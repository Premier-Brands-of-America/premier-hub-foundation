# INTEG-TEAMS — Microsoft Graph Teams Transcripts

Build notes for the Teams-native transcript pipeline (findings §4). Engine =
**Teams native transcript via Microsoft Graph**: fetch the `.vtt`, parse to
speaker-tagged segments, summarize through the existing **read-only** AI
assistant. No third-party transcription processor. The fallback browser recorder
is intentionally **not built** (flagged off per findings §2 / §4.1).

This agent is a **read-only consumer** of INTEG-OUTLOOK's foundation:
- Imports `supabase/functions/_shared/ms-graph.ts` (token decrypt/refresh +
  `graphFetch(userId, path, init)`), via the new file
  `supabase/functions/_shared/teams-graph.ts`. **We do not create or edit
  `ms-graph.ts` or `ms_connections` / `calendar_events`.**
- Reads `ms_connections.ms_user_id` and `calendar_events.join_web_url` /
  `.project_id`.

---

## Tables (migration `20260601120000_teams_transcripts.sql`)

Filename prefix orders this migration **after** INTEG-OUTLOOK's. Created here:

| Table | Columns | RLS |
|---|---|---|
| `graph_subscriptions` | `id, user_id→auth.users, resource, subscription_id (unique), expiration, client_state, created_at` | **Owner-only** `FOR ALL USING/WITH CHECK (user_id = auth.uid())` |
| `meeting_transcripts` | `id, user_id→auth.users, project_id→projects (ON DELETE SET NULL), page_id→pages (ON DELETE SET NULL), ms_meeting_id, subject, started_at, vtt_url, summary_md, status` | **SELECT**: `user_id = auth.uid() OR (project_id IS NOT NULL AND can_view_project(auth.uid(), project_id))` |
| `transcript_segments` | `id, transcript_id→meeting_transcripts (ON DELETE CASCADE), speaker, text, start_ms, end_ms` | **SELECT**: parent transcript visible (same owner-or-project rule via EXISTS) |

`status` CHECK: `pending | fetched | summarized | failed`.

**RLS correction (important):** findings §4.3 wrote the transcript policies
against a `project_members` table. **That table does not exist in this schema.**
Project-scoped read visibility here goes through the existing SECURITY DEFINER
helper `public.can_view_project(_user_id uuid, _project_id uuid)` (public OR
stakeholder OR admin — defined in `20260410193421_*.sql`). We mirror that helper
exactly, the same way `project_updates` / `project_activity` do.

**GRANTs:** `GRANT SELECT` on all three tables to `authenticated` (clients only
read; PAGES renders `meeting_transcripts` + `transcript_segments`). All
privileged **writes** happen server-side in Edge Functions using
`SUPABASE_SECRET_KEY` (`sb_secret_...`, BYPASSRLS) — no client write policy
needed. `tasks` insertion (action items) is the one exception: it runs under the
caller's JWT and the existing owner-only `tasks` policies.

---

## Edge Functions

`supabase/config.toml` is SHARED and **not edited here**. The lead must add the
`verify_jwt` settings below at P4 (each function's index.ts header also records
its setting).

| Function | `verify_jwt` | Trigger | Purpose |
|---|---|---|---|
| `graph-subscribe` | **true** | User action | Create a per-user `users/{msUserId}/onlineMeetings/getAllTranscripts` subscription; record it in `graph_subscriptions`. |
| `graph-renew` | **false** | Cron (secret-key authorized) | Renew subscriptions expiring within 1 day; delete stale rows that fail to renew. |
| `graph-webhook` | **false** | Microsoft Graph | Validation handshake (echo `?validationToken`); validate `clientState`; map `subscriptionId → user_id`; hand off to `transcribe-summarize`. Returns 202. |
| `transcribe-summarize` | **false** | Server-to-server (secret-key authorized) | Ensure row → enrich (subject/start/joinWebUrl, link project via `calendar_events`) → fetch `.vtt` → parse segments → AI summary → write `summary_md`/`status`. |
| `transcript-action-items` | **true** | User action | Parse `## Action Items` from `summary_md` (or accept a curated `items[]`) → insert `tasks` for the caller. |

`config.toml` block for the lead to merge:

```toml
[functions.graph-subscribe]
verify_jwt = true
[functions.graph-renew]
verify_jwt = false
[functions.graph-webhook]
verify_jwt = false
[functions.transcribe-summarize]
verify_jwt = false
[functions.transcript-action-items]
verify_jwt = true
```

### How `_shared/ms-graph.ts` is imported

`_shared/teams-graph.ts` (and through it, every function) depends only on:

```ts
import { graphFetch } from "./ms-graph.ts";
// graphFetch(userId: string, path: string, init?: RequestInit): Promise<Response>
// path is relative to https://graph.microsoft.com/v1.0 and begins with "/".
```

`ms-graph.ts` is authored in INTEG-OUTLOOK's worktree and is **absent here while
building in parallel** — this is expected. The Deno edge code is not part of the
client Vite/tsc build, so its absence does not affect `tsc --noEmit` or
`npm run build`. **Lead reconciles the import at P4** (confirm `graphFetch`
signature; if Outlook named it differently, adjust the one import line in
`teams-graph.ts`).

---

## Subscription lifecycle

- **Create** (`graph-subscribe`): resource
  `users/{msUserId}/onlineMeetings/getAllTranscripts`, `changeType: "created"`,
  `notificationUrl` = `GRAPH_WEBHOOK_URL` or `${SUPABASE_URL}/functions/v1/graph-webhook`,
  `clientState` = `GRAPH_WEBHOOK_CLIENT_STATE`, `expirationDateTime` ≈ **3 days**
  (Graph max for this resource, ~4230 min).
- **Renew** (`graph-renew`, cron): runs on a schedule (recommend **every 12h**);
  PATCHes any subscription expiring within 1 day to push the expiration out
  ~3 days. Stale/expired subscriptions that cannot be renewed are deleted so a
  fresh `graph-subscribe` can recreate them.
- **Notify** (`graph-webhook`): Graph POSTs notifications; we validate
  `clientState`, look up the subscription's `user_id`, extract `meetingId` +
  `transcriptId`, and trigger `transcribe-summarize`.

Cron registration (lead, P4 — pick one): a Supabase scheduled function on
`graph-renew`, or `pg_cron` calling it with the secret key, e.g.

```sql
select cron.schedule('graph-renew-12h', '0 */12 * * *', $$
  select net.http_post(
    url := '<SUPABASE_URL>/functions/v1/graph-renew',
    headers := jsonb_build_object('apikey', '<SUPABASE_SECRET_KEY>')
  );
$$);
```

---

## Secrets (Supabase Function secrets — never `VITE_*`)

Set via `supabase secrets set NAME=value`. Full list this agent depends on
(findings §4.4):

| Secret | Used by | Notes |
|---|---|---|
| `SUPABASE_SECRET_KEY` | all server fns | `sb_secret_...`; privileged DB writes + cron/webhook authorization (replaces legacy `service_role`). |
| `SUPABASE_URL` | all | Auto-provisioned on platform. |
| `SUPABASE_ANON_KEY` | `graph-subscribe`, `transcript-action-items` | RLS-scoped client to verify the caller JWT (matches `ai-assistant`). |
| `MS_GRAPH_CLIENT_ID` | `ms-graph.ts` (Outlook) | OAuth app. |
| `MS_GRAPH_CLIENT_SECRET` | `ms-graph.ts` (Outlook) | OAuth app secret. |
| `MS_GRAPH_TENANT_ID` | `ms-graph.ts` (Outlook) | Entra tenant. |
| `MS_GRAPH_REDIRECT_URI` | `ms-graph.ts` (Outlook) | OAuth redirect. |
| `TOKEN_ENCRYPTION_KEY` | `ms-graph.ts` (Outlook) | Encrypts `ms_connections.refresh_token_enc` at rest. |
| `GRAPH_WEBHOOK_CLIENT_STATE` | `graph-subscribe`, `graph-webhook` | Shared secret validating inbound notifications. |
| `AI_ASSISTANT_API_KEY` | `transcribe-summarize` | Read-only AI summary via the AI gateway (`agentic.lovable.dev`, model `google/gemini-3-flash-preview` — same gateway as `ai-assistant`, which today reads `LOVABLE_API_KEY`; lead may alias these at deploy). |
| `GRAPH_WEBHOOK_URL` | `graph-subscribe` | Optional; overrides the derived webhook URL. |

`MS_GRAPH_*` and `TOKEN_ENCRYPTION_KEY` are owned/consumed by `ms-graph.ts`
(INTEG-OUTLOOK) — listed for completeness since the Teams functions call
`graphFetch`, which relies on them.

OAuth scopes this agent requires (delegated, per-user): **`OnlineMeetingTranscript.Read.All`,
`OnlineMeetings.Read`** (on top of Outlook's `Calendars.Read`, `Mail.Read`,
`offline_access openid profile`).

---

## Tenant-wide application access policy (admin-granted)

Reading Teams transcripts via Graph requires more than the OAuth scope. A
**Teams application access policy** must be created and granted by a tenant
admin so the app is authorized to read online-meeting artifacts for users
([OnlineMeetingTranscript.Read.All](https://graphpermissions.merill.net/permission/OnlineMeetingTranscript.Read.All)).
This is provisioned **once** by an M365 admin (PowerShell:
`New-CsApplicationAccessPolicy` / `Grant-CsApplicationAccessPolicy`); without it,
transcript fetches return `403`. Required for both delegated and app-only paths
for transcript content; record it as a deployment prerequisite.

---

## Data contract with PAGES (findings §4.3)

PAGES renders by reading these tables — this agent only **produces** the data:

- `meeting_transcripts`: `summary_md` (Markdown; includes `## Summary`,
  `## Key Points`, `## Action Items` GitHub task list), `subject`, `started_at`,
  `status`.
- `transcript_segments`: `speaker`, `text`, `start_ms`, `end_ms` (ordered by
  `start_ms`).

`transcribe-summarize` authors the `## Action Items` list in the exact format
`- [ ] <action> (owner: <name>) (due: <YYYY-MM-DD|none>)` so
`transcript-action-items` can parse it deterministically.

---

## For the lead at P4 (reconcile)

1. **`_shared/ms-graph.ts` import** — confirm `graphFetch(userId, path, init)`
   exists with that signature; adjust the single import in `teams-graph.ts` if
   Outlook named it differently. `teams-graph.ts` is a new file (not Outlook's).
2. **`supabase/config.toml`** — add the five `[functions.*] verify_jwt` blocks
   above.
3. **`src/integrations/supabase/types.ts`** — regenerate to include
   `graph_subscriptions`, `meeting_transcripts`, `transcript_segments` (this
   agent did not edit the shared generated types; no client reads were added
   here, so none cast at a `.from()` boundary yet).
4. **Migration ordering** — `20260601120000` intentionally sorts after Outlook's
   `ms_connections` / `calendar_events` migration (FKs/reads depend on them).
5. **Cron** — register `graph-renew` (see above).
6. **Admin prerequisite** — Teams application access policy must be granted
   before transcripts can be fetched.
