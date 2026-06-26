# INTEG-OUTLOOK — MS Graph foundation, calendar & mail

> Build doc for the Outlook integration and the **shared MS-Graph foundation**
> that INTEG-TEAMS consumes. Spec: `research/findings.md §4`,
> `research/supabase-keys.md`. Branch `feat/integ-outlook`.
>
> **Teams owns** `research/integrations.md` — this file is INTEG-OUTLOOK's only doc.

---

## 1. What this delivers

- **Shared MS-Graph foundation** (owned here, imported by Teams): the OAuth
  consent/exchange flow, the single per-user token store `ms_connections`, token
  encrypt/decrypt + access-token refresh, and the generic `graphFetch` wrapper
  (`supabase/functions/_shared/ms-graph.ts`).
- **Outlook calendar** linked to projects (`calendar_events` + `calendar-sync` +
  `link-event-to-project`) — the beat-Notion deep calendar↔project linking.
- **Email search parity** (`mail-search`, live `/me/messages` search, not
  persisted) surfaced Notion-style.
- **UI**: a tabbed Outlook panel on project pages (`src/components/integrations/outlook/`).

---

## 2. Edge Functions + required `verify_jwt`

> ⚠️ `supabase/config.toml` was **NOT edited** (shared with INTEG-TEAMS). The LEAD
> consolidates these entries at P4. Each function also states its setting in a
> header comment.

| Function | `verify_jwt` | Auth model | Purpose |
|---|---|---|---|
| `ms-oauth-start` | **true** | user JWT | Builds the Entra `authorize` URL (client_id/scopes server-side) + a signed `state`; returns `{ authorizeUrl }`. |
| `ms-oauth-callback` | **false** | HMAC-signed `state` | Hit by Entra's top-level **browser redirect** (no Authorization header). Validates `state`, exchanges the code, encrypts + upserts the refresh token, then 302s back to the app. |
| `calendar-sync` | **true** | user JWT (+ secret-key writes) | Pulls `/me/calendarView` + `/me/events` → upserts `calendar_events` (preserves `project_id`). |
| `link-event-to-project` | **true** | user JWT (+ secret-key writes) | Sets/clears `calendar_events.project_id` for the caller's own event after a `can_view_project` check. |
| `mail-search` | **true** | user JWT | Live `/me/messages?$search=` on the caller's behalf; returns mapped messages. Mail is not stored. |

Suggested `config.toml` block for the LEAD (P4):

```toml
[functions.ms-oauth-start]
verify_jwt = true
[functions.ms-oauth-callback]
verify_jwt = false      # browser redirect; authenticated via signed state
[functions.calendar-sync]
verify_jwt = true
[functions.link-event-to-project]
verify_jwt = true
[functions.mail-search]
verify_jwt = true
```

### Why `ms-oauth-callback` is `verify_jwt = false`
`App.tsx` is **frozen**, so a dedicated SPA callback route to capture Entra's
`?code` was not possible. Instead the redirect lands directly on the function.
Because a top-level browser redirect carries no `Authorization` header, the
request is authenticated by an **HMAC-signed `state`** minted by `ms-oauth-start`
for the logged-in user (uid + return origin, 10-min TTL, signed with
`TOKEN_ENCRYPTION_KEY`). `MS_GRAPH_REDIRECT_URI` must point at this function's URL
and be registered in the Entra app.

---

## 3. Required secrets (names only — never values, never `VITE_*`)

Set via `supabase secrets set NAME=value` (findings §4.4):

| Secret | Used by | Notes |
|---|---|---|
| `MS_GRAPH_CLIENT_ID` | start, callback, refresh | Entra app (client) id |
| `MS_GRAPH_CLIENT_SECRET` | callback, refresh | Entra client secret |
| `MS_GRAPH_TENANT_ID` | start, callback, token endpoint | Entra tenant id |
| `MS_GRAPH_REDIRECT_URI` | start, callback | Must equal the `ms-oauth-callback` URL, registered in Entra |
| `TOKEN_ENCRYPTION_KEY` | encrypt/decrypt + state HMAC | AES-256-GCM key material (any string; SHA-256-derived) |
| `SUPABASE_SECRET_KEY` | all DB writes / token reads | `sb_secret_…`; falls back to `SUPABASE_SERVICE_ROLE_KEY` |
| `SUPABASE_PUBLISHABLE_KEY` | user-JWT client | `sb_publishable_…`; falls back to `SUPABASE_ANON_KEY` |
| `ALLOWED_ORIGIN` *(optional)* | CORS | defaults to `*` |

Scopes requested (delegated): `Calendars.Read  Mail.Read  offline_access openid profile`.

---

## 4. Data model (migration `20260601110000_ms_oauth_calendar.sql`)

Ordered **before** the Teams migration on purpose.

### `ms_connections` (per-user token store — Teams reads this)
| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | uuid → `auth.users` (cascade) | `UNIQUE` — one connection per user |
| `ms_tenant_id` | text not null | |
| `ms_user_id` | text not null | Graph `/me` id |
| `refresh_token_enc` | **bytea** not null | AES-256-GCM (iv‖ct); **never** client-readable |
| `scopes` | text[] not null | |
| `expires_at` | timestamptz | last access-token expiry (informational) |
| `created_at` | timestamptz default now() | |

**RLS**: `own_ms_connections` `FOR ALL using(user_id=auth.uid()) with check(user_id=auth.uid())`.
**GRANT**: column-scoped `SELECT (id,user_id,ms_tenant_id,ms_user_id,scopes,expires_at,created_at)` + `DELETE` to `authenticated` — `refresh_token_enc` is intentionally **excluded** from the client grant; inserts/updates are server-side only.

### `calendar_events` (Outlook events ↔ projects — Teams reads this)
| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | uuid → `auth.users` (cascade) | |
| `ms_event_id` | text not null | `UNIQUE (user_id, ms_event_id)` for upsert |
| `subject` | text | |
| `join_web_url` | text | **Teams matches this** to resolve the meeting id |
| `start_at` / `end_at` | timestamptz | |
| `project_id` | uuid → `projects` (set null) | the link Teams uses for transcript association |

**RLS**: `own_calendar_events` `FOR ALL` (owner) **+** `view_project_calendar_events`
`FOR SELECT using(project_id is not null AND public.can_view_project(auth.uid(), project_id))`.
**GRANT**: full CRUD to `authenticated` (RLS-scoped).

> **Data-model correction applied**: findings §4.3 referenced a non-existent
> `project_members` table. Project visibility here uses the **real** SECURITY
> DEFINER helper `public.can_view_project(_user_id, _project_id)` (migration
> `20260410192303_…`), the same pattern as `tasks`/`project_updates`.

---

## 5. `_shared/ms-graph.ts` API (the contract Teams imports)

```ts
import { graphFetch, getAccessToken, getAdminClient, getUserClient,
         getAuthedUserId, encryptToken, decryptToken, signState, verifyState,
         json, corsHeaders, handleOptions, GRAPH_BASE } from "../_shared/ms-graph.ts";
```

| Export | Signature | Notes |
|---|---|---|
| `graphFetch` | `(userId, path, init?) => Promise<Response>` | **Generic** Graph v1.0 call (Bearer auto-attached). Teams uses it for `/me/onlineMeetings/.../transcripts`. |
| `getAccessToken` | `(userId) => Promise<string>` | Refresh-token → access-token, rotates stored token, in-process cached. Throws `"NO_CONNECTION"` if the user has no row. |
| `getAdminClient` | `() => SupabaseClient` | Secret key (BYPASSRLS). |
| `getUserClient` | `(authHeader) => SupabaseClient` | Publishable key + caller JWT (RLS). |
| `getAuthedUserId` | `(req) => Promise<string \| null>` | Resolves uid from bearer token. |
| `encryptToken` / `decryptToken` | `(plain) => Promise<string>` / `(stored) => Promise<string>` | AES-256-GCM; returns/accepts Postgres `\x…` bytea hex. |
| `signState` / `verifyState` | `(payload, ttl?) => Promise<string>` / `(token) => Promise<T\|null>` | HMAC-signed OAuth state. |
| `json` / `corsHeaders` / `handleOptions` | HTTP helpers | Shared CORS + JSON responses. |
| `GRAPH_BASE` | `"https://graph.microsoft.com/v1.0"` | |

**Teams usage sketch:**
```ts
const res = await graphFetch(userId, `/me/onlineMeetings/${meetingId}/transcripts`);
// resolve meetingId from calendar_events.join_web_url (this agent populates it)
```

---

## 6. Client surface (`src/components/integrations/outlook/`)

- `outlook-api.ts` — RLS-scoped reads of `ms_connections`/`calendar_events`
  (local row interfaces; cast at the `.from()` boundary since `types.ts` is
  off-limits) + `supabase.functions.invoke` wrappers.
- `hooks.ts` — TanStack Query hooks (`useOutlookConnection`,
  `useProjectCalendarEvents`, `useUnlinkedEvents`, `useConnectOutlook`,
  `useSyncCalendar`, `useLinkEvent`, `useMailSearch`).
- `OutlookCalendarPanel.tsx` — tabbed panel (Calendar / Email) with a
  "Connect Outlook" empty state; mounted in `ProjectDetailPanel.tsx`.
- `OutlookEmailSearch.tsx` — live email search surface.

Mounted via a single line in `src/components/projects/ProjectDetailPanel.tsx`
(after `BacklinksPanel`). No frozen files touched.

---

## 7. Contract with INTEG-TEAMS

- INTEG-OUTLOOK **owns & populates** `ms_connections`, `calendar_events`
  (incl. `join_web_url`, `project_id`), and `_shared/ms-graph.ts`.
- INTEG-TEAMS **reads** them (does not modify) to associate a transcript with the
  right project/page via the meeting join URL. Both code against findings §4.3.

---

## 8. For the LEAD to reconcile at P4

1. **`config.toml`** — add the five `[functions.*]` blocks in §2 (note
   `ms-oauth-callback` = `verify_jwt = false`).
2. **`types.ts` regen** — regenerate Supabase types after this migration so
   `ms_connections`/`calendar_events` are typed; the client currently casts at
   the `.from()` boundary (`outlook-api.ts`) and can drop the casts afterward.
3. **Migration ordering** — `20260601110000_ms_oauth_calendar.sql` must run
   **before** the Teams migration (graph_subscriptions/meeting_transcripts) —
   prefix chosen accordingly.
4. **Secrets** — set everything in §3 (esp. `MS_GRAPH_REDIRECT_URI` = the
   deployed `ms-oauth-callback` URL, also registered in the Entra app).
5. **Entra app** — add the `ms-oauth-callback` URL as a redirect URI and ensure
   the delegated scopes in §3 are consented.
6. **Additive constraints** beyond findings §4.3 (intentional): `UNIQUE(user_id)`
   on `ms_connections`, `UNIQUE(user_id, ms_event_id)` on `calendar_events`.
