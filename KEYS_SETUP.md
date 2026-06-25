# Premier Project Hub v2 — Keys Setup (what's left to do)

This is **only the steps you still need to do.** Things already handled are listed at the
bottom under [Already done](#-already-done--no-action) — don't touch those.

Project ref: **`yogscxuhjalgwngefbta`**. Two rules:
- **Edge secrets** (service_role, `MS_GRAPH_*`, `TOKEN_*`, AI key) are set with
  `supabase secrets set …` — **never** in a `VITE_*` var (those ship to the browser).
- Collect the values in steps 1–5; I'll help you set + deploy them (the 🚀 section) once
  the build branches are merged.

---

## 🔧 To do

### Step 1 — Add Graph access to your existing Entra app
Open **Azure Portal → Microsoft Entra ID → App registrations → the app that backs Supabase
Auth** (reuse it — don't make a new one).

1. **API permissions → Add → Microsoft Graph → Delegated** — add:
   `Calendars.Read`, `Mail.Read`, `OnlineMeetings.Read`, `OnlineMeetingTranscript.Read.All`,
   `offline_access`, `openid`, `profile` → then **Grant admin consent**.
2. **Certificates & secrets → New client secret** → copy the **Value**.
3. **Authentication → Web → Redirect URIs → Add** (keep the existing Auth callback too):
   ```
   https://yogscxuhjalgwngefbta.supabase.co/functions/v1/ms-oauth-callback
   ```

**Collect:**
| Value | Where |
|---|---|
| `MS_GRAPH_CLIENT_ID` | app → Overview → Application (client) ID |
| `MS_GRAPH_TENANT_ID` | app → Overview → Directory (tenant) ID |
| `MS_GRAPH_CLIENT_SECRET` | the secret **Value** from step 2 |
| `MS_GRAPH_REDIRECT_URI` | `https://yogscxuhjalgwngefbta.supabase.co/functions/v1/ms-oauth-callback` |

### Step 2 — Teams application access policy (needs an M365 admin)
Required for Teams transcripts — **without it, Graph returns 403.** An admin runs once:
```powershell
Connect-MicrosoftTeams
New-CsApplicationAccessPolicy -Identity "PremierHubTranscripts" `
  -AppIds "<MS_GRAPH_CLIENT_ID>" -Description "Premier Hub transcript access"
Grant-CsApplicationAccessPolicy -PolicyName "PremierHubTranscripts" -Global
```

### Step 3 — Generate two secrets
```bash
openssl rand -base64 32     # → TOKEN_ENCRYPTION_KEY
openssl rand -hex 32        # → GRAPH_WEBHOOK_CLIENT_STATE
```

### Step 4 — AI gateway key
The meeting-summary function reads `AI_ASSISTANT_API_KEY`. Set it to the **same value as your
existing `LOVABLE_API_KEY`** (same gateway). If you don't have that handy, grab it from your
Lovable project settings.

### Step 5 — Grab the service_role key
Dashboard → **Settings → API → Project API keys → `service_role`** → copy it (you'll set it
as the `SUPABASE_SERVICE_ROLE_KEY` edge secret). No new key needed.

### Step 6 — (Optional) RS256 JWT signing keys
Dashboard → **Authentication → Signing Keys** → enable **RS256**. Recommended for local JWT
verification in Edge Functions; the app works without it, so skip if you want.

---

## 📋 Values to collect (hand these to me, or hold for the 🚀 step)
- [ ] `MS_GRAPH_CLIENT_ID`
- [ ] `MS_GRAPH_TENANT_ID`
- [ ] `MS_GRAPH_CLIENT_SECRET`
- [ ] `MS_GRAPH_REDIRECT_URI` = `https://yogscxuhjalgwngefbta.supabase.co/functions/v1/ms-oauth-callback`
- [ ] `TOKEN_ENCRYPTION_KEY` (step 3)
- [ ] `GRAPH_WEBHOOK_CLIENT_STATE` (step 3)
- [ ] `AI_ASSISTANT_API_KEY` (= your `LOVABLE_API_KEY`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (step 5)
- [ ] Teams access policy granted (step 2) ☐ admin confirmed

---

## 🚀 At deploy time (after the build branches merge — we do this together)
Nothing for you to gather here; listed so you know it's coming.
```bash
supabase link --project-ref yogscxuhjalgwngefbta
supabase secrets set \
  SUPABASE_SERVICE_ROLE_KEY=… MS_GRAPH_CLIENT_ID=… MS_GRAPH_CLIENT_SECRET=… \
  MS_GRAPH_TENANT_ID=… MS_GRAPH_REDIRECT_URI=… TOKEN_ENCRYPTION_KEY=… \
  GRAPH_WEBHOOK_CLIENT_STATE=… AI_ASSISTANT_API_KEY=…
supabase db push                 # apply the new migrations
```
Then register the subscription-renew cron (Graph subs expire ~3 days):
```sql
select cron.schedule('graph-renew-12h', '0 */12 * * *', $$
  select net.http_post(
    url := 'https://yogscxuhjalgwngefbta.supabase.co/functions/v1/graph-renew',
    headers := jsonb_build_object('apikey', '<SUPABASE_SERVICE_ROLE_KEY>')
  ); $$);
```

---

## ✅ Already done — no action
- **Client `.env`** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`)
  — already set with your existing keys; the app uses them. Keeping the existing anon key is
  fine (RLS-scoped, browser-safe — no rotation).
- **Supabase project & keys** — same project, same keys.
- **SharePoint** (`AZURE_*`, `SP_*`) — already configured for the existing integration.

> Optional hygiene: `git rm --cached .env` stops tracking the client `.env` (keeps your local
> copy). Not required — just never commit the **edge** secrets above.
