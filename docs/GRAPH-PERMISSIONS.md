# Microsoft Graph permissions — calendar event creation (meeting scheduler)

This documents the **exact scope delta** required to create Outlook calendar
events from the "Schedule in Outlook" action, built on the existing M365 / MS
Graph integration. **No app-registration or admin-consent change was made by
this run — that is an Entra admin action for the owner.** The feature degrades
gracefully until the delta is granted: the in-app toggle persists, and the
"Schedule in Outlook" button uses a browser **deeplink** fallback
(`outlook.office.com/.../deeplink/compose`) that needs no elevated scopes.

Verify names/flows against the official reference before consenting:
<https://learn.microsoft.com/en-us/graph/permissions-reference>

## 1. Current state (read from the repo)

- **Auth flow:** delegated (OAuth auth-code), per `supabase/functions/ms-oauth-start/index.ts`.
- **Scopes currently requested** (`SCOPES` in `ms-oauth-start/index.ts`):
  `Calendars.Read  Mail.Read  offline_access  openid  profile`
- **Graph helper:** `supabase/functions/_shared/ms-graph.ts` → `graphFetch(userId, path, init)`
  (Bearer auto-attached; base `https://graph.microsoft.com/v1.0`).
- **Existing calendar use:** read-only (`calendar-sync` pulls `/me/calendarView` + `/me/events`).
- **Endpoint base:** standard `graph.microsoft.com` (work/M365 tenant — correct).

## 2. What event creation requires

`POST /me/events` (create an event in the signed-in user's calendar) requires
write access to the user's calendar.

| Capability | Delegated scope | Application scope (app-only) |
|---|---|---|
| Create events in the **signed-in user's** calendar | **`Calendars.ReadWrite`** | `Calendars.ReadWrite` (targets `/users/{id}/events`, **admin consent required**) |
| Write to **another user's / shared** calendar | `Calendars.ReadWrite.Shared` | — |
| Attach a **Teams online-meeting** link to the event | `OnlineMeetings.ReadWrite` | `OnlineMeetings.ReadWrite.All` (+ application access policy) |

## 3. The exact delta to add (delegated flow in use)

Add to `SCOPES` in `supabase/functions/ms-oauth-start/index.ts`:

```
Calendars.ReadWrite           ← REQUIRED (replaces/augments Calendars.Read)
OnlineMeetings.ReadWrite      ← OPTIONAL, only if the event should carry a Teams link
Calendars.ReadWrite.Shared    ← OPTIONAL, only if writing to a manager's shared calendar
```

Where to grant in Entra (owner action):
1. Entra admin center → App registrations → (the Premier Hub app) → **API permissions**.
2. **Add a permission → Microsoft Graph → Delegated** → add the scopes above.
3. **Grant admin consent** for the tenant (delegated calendar write is consentable by
   the user, but tenant-wide consent avoids per-user prompts).
4. Users re-run the Outlook **Connect** flow once so the new scope is on their token.

App-only alternative (not the current flow): use `Calendars.ReadWrite`
**Application**, requires admin consent, and the function must POST to
`/users/{msUserId}/events` (NOT `/me/events`).

---

# Microsoft Graph permissions — org directory (Feature 1)

The org directory + Org Chart pull richer per-user info and the reports-to /
direct-reports hierarchy. **No app-registration or admin-consent change was made
by this run — that is an Entra admin action for the owner.** Until consented, the
app uses the seeded **preview demo org**; the `graph-user-directory` edge fn +
`org_directory` table are written and run only once the scope is granted.

## Fields pulled (per user)
`jobTitle`, `department`, `officeLocation`, `mail`, `manager` (via `$expand=manager`),
and a `directReports` count — from `GET /users?$select=...&$expand=manager` and,
optionally, `GET /users/{id}/directReports`.

## Exact scope delta (verify against the permissions-reference before consent)
<https://learn.microsoft.com/en-us/graph/permissions-reference>

| Capability | Delegated scope | Application scope (app-only) |
|---|---|---|
| Read all users' profile + jobTitle/department/officeLocation/mail | **`User.Read.All`** | `User.Read.All` (admin consent) |
| Read `manager` / `directReports` relationships | covered by `User.Read.All`, or **`User.Read` + `Directory.Read.All`** | `Directory.Read.All` (admin consent) |

Recommended minimum: **`User.Read.All`** (covers profile fields + manager +
directReports). Use `User.Read` + `Directory.Read.All` if your tenant restricts
`User.Read.All`.

Add to `SCOPES` in `supabase/functions/ms-oauth-start/index.ts` (delegated flow):
```
User.Read.All                 ← REQUIRED for the org directory / Org Chart
Directory.Read.All            ← OPTIONAL alternative path for manager/reports
```

Where to grant in Entra (owner action): App registrations → (Premier Hub app) →
**API permissions** → Add → Microsoft Graph → **Delegated** (or Application for an
app-only sync) → add the scope(s) → **Grant admin consent**. Then invoke the
`graph-user-directory` edge function to populate `org_directory` and backfill
`profiles.title/department/office_location/manager_email`.

## Build status
- Edge fn `supabase/functions/graph-user-directory/index.ts` + migration
  `20260627180000_feature1_org_directory.sql` (org_directory table, profiles.office_location,
  `get_org_chart_data()` RPC) are **written, NOT pushed**.
- Preview shows a seeded demo org (`src/lib/orgGraphDemo.ts`) via the graph "Org" mode
  and `/org` route; no scope needed to review.

## 4. Build status / runtime test

- Feature is **built** against `Calendars.ReadWrite`: see
  `src/lib/outlookPrefill.ts` (`buildGraphEvent` → `POST /me/events` payload) and
  the edge function `supabase/functions/calendar-create-event/` added by this run.
- The browser deeplink fallback works **today** with no scope change.
- **Runtime test of `POST /me/events` is PENDING the scope grant** — logged in
  `BLOCKERS.md`. Once `Calendars.ReadWrite` is consented and the edge function is
  deployed, wire the "Schedule in Outlook" button to invoke
  `calendar-create-event` instead of (or in addition to) the deeplink.
