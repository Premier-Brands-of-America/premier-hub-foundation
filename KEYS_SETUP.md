# Premier Project Hub v2 — Keys & Secrets Setup

A step-by-step guide to obtaining and setting every credential the app needs. Work
top to bottom; each section says **where to get it** and **where to put it**.

There are **two credential surfaces** — keep them separate:

| Surface | File / location | Privilege | Examples |
|---|---|---|---|
| **Client** (browser) | root `.env` (from `.env.example`) | Low, RLS-enforced, safe to ship | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| **Edge Functions** (server) | `supabase secrets set …` (prod) / `supabase/functions/.env` (local) | Privileged — **never** in the browser | `SUPABASE_SECRET_KEY`, `MS_GRAPH_*`, `TOKEN_ENCRYPTION_KEY`, … |

> ⚠️ **Never** put a secret key (`sb_secret_…` / `service_role`) or any `MS_GRAPH_*`,
> `TOKEN_ENCRYPTION_KEY`, AI key, etc. in a `VITE_*` variable — Vite bundles those
> into the public browser build.

---

## ✅ Quick checklist

- [ ] **1.** Client `.env` — Supabase URL + publishable key
- [ ] **2.** Supabase privileged key for Edge Functions (reuse existing `service_role`, or new `sb_secret_…`)
- [ ] **3.** Enable RS256 JWT signing keys (dashboard toggle)
- [ ] **4.** Microsoft Entra app — Graph scopes, client secret, redirect URI, admin consent
- [ ] **5.** Teams **application access policy** (admin PowerShell) — required for transcripts
- [ ] **6.** Generate `TOKEN_ENCRYPTION_KEY` + `GRAPH_WEBHOOK_CLIENT_STATE`
- [ ] **7.** AI gateway key (`LOVABLE_API_KEY` / `AI_ASSISTANT_API_KEY`)
- [ ] **8.** (Already set) SharePoint `AZURE_*` / `SP_*` — confirm reuse for Graph
- [ ] **9.** Set all Edge secrets, apply migrations, register the renew cron
- [ ] **🔒** (Optional) stop tracking `.env` — keeping the existing anon key is fine; no rotation needed

Your project ref is **`yogscxuhjalgwngefbta`** (URLs below use it; change if you point at a different project).

---

## 1. Client `.env` — Supabase URL + publishable key

1. `cp .env.example .env`
2. Supabase Dashboard → your project → **Settings → API** (and **Settings → API Keys**).
3. Fill in `.env`:
   - `VITE_SUPABASE_URL` = **Project URL** → `https://yogscxuhjalgwngefbta.supabase.co`
   - `VITE_SUPABASE_PROJECT_ID` = the project ref → `yogscxuhjalgwngefbta`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = the browser-safe, RLS-scoped key under
     **Settings → API**.
     - **This project (created via Lovable.ai) already has an `anon` key — keep it.**
       It's the value already in your local `.env`; **no rotation or migration needed.**
       It's browser-safe by design. (If you ever want to modernize, the new
       `sb_publishable_…` family is a drop-in replacement — optional, not required here.)

That's all the client needs to run (`npm run dev`) — and it's likely already set.

---

## 2. Supabase **secret** key for Edge Functions

Edge Functions do privileged work (decrypt tokens, write transcripts) and need a
**privileged** key, never the publishable one.

1. **Use this project's existing `service_role` key** — it already has one (Settings →
   API → Project API keys → `service_role`). The Edge Functions read `SUPABASE_SECRET_KEY`
   and **fall back to `SUPABASE_SERVICE_ROLE_KEY`**, so set whichever you prefer:
   - simplest (keep your current keys) → set `SUPABASE_SERVICE_ROLE_KEY` = the existing service_role value, **or**
   - modernize (optional) → Settings → API Keys → Create secret key → set `SUPABASE_SECRET_KEY=sb_secret_…`.
2. Either way it's set as an **Edge secret** in step 9 — **never** in a `VITE_*` var.

> On the deployed Supabase platform, `SUPABASE_URL`, the key envs, and `SUPABASE_JWKS`
> are auto-provisioned — you mainly set the **non-Supabase** secrets (steps 4–7) in prod.

---

## 3. Enable RS256 JWT signing keys

So Edge Functions can verify the user's Entra→Supabase JWT locally (no Auth round-trip).

1. Dashboard → **Authentication → Signing Keys** (a.k.a. JWT Keys).
2. Enable **asymmetric** signing and select **RS256** (prefer RS256 over ES256 — there's
   a known Edge gateway `401 Invalid JWT` issue with ES256). Test login after rotating.
3. Nothing to copy — public keys are published at
   `https://yogscxuhjalgwngefbta.supabase.co/auth/v1/.well-known/jwks.json`.

---

## 4. Microsoft Entra app — Graph (Outlook + Teams)

The Outlook/Teams features call Microsoft Graph on the user's behalf. **Reuse the same
Entra app registration you already created for Supabase Auth.** One app can hold the
sign-in (OpenID) permissions *and* the Graph delegated permissions, and can list
**multiple redirect URIs** — you just add the Graph scopes + the new callback URL to it.
(The existing SharePoint `AZURE_*` app is also a candidate; ideally consolidate on one app
for all Microsoft integrations.) Create a *separate* app only if you specifically want
credential isolation / different admins.

1. **Azure Portal → Microsoft Entra ID → App registrations** → open the **same app that
   backs Supabase Auth** (do not create a new one unless you want isolation).
2. **API permissions → Add a permission → Microsoft Graph → Delegated permissions**, add:
   - `Calendars.Read`
   - `Mail.Read`
   - `OnlineMeetings.Read`
   - `OnlineMeetingTranscript.Read.All`
   - `offline_access`, `openid`, `profile`
   Then **Grant admin consent** for the tenant.
3. **Certificates & secrets → New client secret** → copy the secret **Value** (not the
   Secret ID). → `MS_GRAPH_CLIENT_SECRET`.
4. From the app **Overview**: **Application (client) ID** → `MS_GRAPH_CLIENT_ID`;
   **Directory (tenant) ID** → `MS_GRAPH_TENANT_ID`.
5. **Authentication → Web → Redirect URIs** — **add** (don't replace; keep your existing
   Supabase Auth callback) **exactly**:
   ```
   https://yogscxuhjalgwngefbta.supabase.co/functions/v1/ms-oauth-callback
   ```
   Use this same string for `MS_GRAPH_REDIRECT_URI`. (The OAuth redirect lands directly
   on the `ms-oauth-callback` Edge Function; it's authenticated by an HMAC-signed `state`,
   so it intentionally runs with `verify_jwt = false`.)

---

## 5. Teams **application access policy** (admin) — required for transcripts

Reading Teams transcripts via Graph needs **more than the OAuth scope**: a tenant admin
must create and grant a Teams **application access policy** authorizing the app to read
online-meeting artifacts. **Without it, transcript fetches return `403`.** Provision once:

```powershell
# Teams PowerShell (admin)
Connect-MicrosoftTeams
New-CsApplicationAccessPolicy -Identity "PremierHubTranscripts" `
  -AppIds "<MS_GRAPH_CLIENT_ID>" -Description "Premier Hub transcript access"
Grant-CsApplicationAccessPolicy -PolicyName "PremierHubTranscripts" -Global
# (or grant per-user instead of -Global)
```

---

## 6. Generate crypto / webhook secrets

Run locally and copy the output:

```bash
# Encrypts ms_connections.refresh_token_enc at rest + signs OAuth state
openssl rand -base64 32      # → TOKEN_ENCRYPTION_KEY

# Validates inbound Microsoft Graph webhook notifications
openssl rand -hex 32         # → GRAPH_WEBHOOK_CLIENT_STATE
```

`GRAPH_WEBHOOK_URL` is optional — leave unset and it defaults to
`https://yogscxuhjalgwngefbta.supabase.co/functions/v1/graph-webhook`.

---

## 7. AI gateway key (read-only summaries)

The meeting-summary feature uses the same read-only AI gateway as the existing AI
assistant.

- The existing `ai-assistant` function reads **`LOVABLE_API_KEY`**.
- The new Teams `transcribe-summarize` function reads **`AI_ASSISTANT_API_KEY`**.

**Set both to the same gateway key** (gateway: `agentic.lovable.dev`). If you already have
`LOVABLE_API_KEY` set, just add `AI_ASSISTANT_API_KEY` with the same value.

---

## 8. Existing SharePoint secrets (already configured)

These are already set for the `sharepoint-provision` function — listed for completeness.
The same Entra app can serve both SharePoint and Graph:

`AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`, `SP_DRIVE_ID`, `SP_ROOT_FOLDER`.

---

## 9. Set Edge secrets, apply migrations, register cron (deploy)

**Set every server secret** (prod):

```bash
supabase link --project-ref yogscxuhjalgwngefbta

supabase secrets set \
  SUPABASE_SECRET_KEY=sb_secret_xxx \
  SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx \
  MS_GRAPH_CLIENT_ID=xxx \
  MS_GRAPH_CLIENT_SECRET=xxx \
  MS_GRAPH_TENANT_ID=xxx \
  MS_GRAPH_REDIRECT_URI=https://yogscxuhjalgwngefbta.supabase.co/functions/v1/ms-oauth-callback \
  TOKEN_ENCRYPTION_KEY=xxx \
  GRAPH_WEBHOOK_CLIENT_STATE=xxx \
  AI_ASSISTANT_API_KEY=xxx \
  LOVABLE_API_KEY=xxx
```

*(For local testing instead, copy `supabase/functions/.env.example` →
`supabase/functions/.env` and run `supabase functions serve`.)*

**Apply migrations** (creates `dashboard_layouts`, `ms_connections`, `calendar_events`,
`graph_subscriptions`, `meeting_transcripts`, `transcript_segments`):

```bash
supabase db push        # or: supabase migration up
```

**Register the subscription-renew cron** (Graph subscriptions expire ~3 days; renew every 12h):

```sql
select cron.schedule('graph-renew-12h', '0 */12 * * *', $$
  select net.http_post(
    url := 'https://yogscxuhjalgwngefbta.supabase.co/functions/v1/graph-renew',
    headers := jsonb_build_object('apikey', '<SUPABASE_SECRET_KEY>')
  );
$$);
```

---

## 🔒 Security follow-up (recommended)

The repo **tracks a committed `.env`** with the project's `anon`/publishable key for
`yogscxuhjalgwngefbta`. **Decision: keep this key** (it's the project's existing key, kept
on purpose). That's fine — the anon key is RLS-scoped and browser-safe by design, so this
is **not** a `service_role`-level leak and **no rotation is needed**.

The one rule that matters: **never commit the Edge secrets** (the `service_role` key,
`MS_GRAPH_*`, `TOKEN_ENCRYPTION_KEY`, etc.) — those go via `supabase secrets set`, never
into any tracked file. `.gitignore` already blocks real `.env` / `supabase/functions/.env`.

*Optional hygiene* — stop tracking the client `.env` too (keeps your local copy):
```bash
git rm --cached .env && git commit -m "chore: stop tracking .env (use .env.example)"
```

---

## 📋 Full secret reference

| Name | Surface | Where to get it | Set in |
|---|---|---|---|
| `VITE_SUPABASE_URL` | client | Dashboard → Settings → API | `.env` |
| `VITE_SUPABASE_PROJECT_ID` | client | project ref | `.env` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client | Settings → API Keys (`sb_publishable_…`) | `.env` |
| `SUPABASE_SECRET_KEY` | edge | Settings → API Keys (`sb_secret_…`) | `supabase secrets set` |
| `SUPABASE_PUBLISHABLE_KEY` | edge | Settings → API Keys | `supabase secrets set` |
| `SUPABASE_URL` | edge | auto in prod; project URL locally | `supabase secrets` / local `.env` |
| `MS_GRAPH_CLIENT_ID` | edge | Entra app → Overview | `supabase secrets set` |
| `MS_GRAPH_CLIENT_SECRET` | edge | Entra app → Certificates & secrets (Value) | `supabase secrets set` |
| `MS_GRAPH_TENANT_ID` | edge | Entra app → Overview | `supabase secrets set` |
| `MS_GRAPH_REDIRECT_URI` | edge | the `ms-oauth-callback` function URL | `supabase secrets set` |
| `TOKEN_ENCRYPTION_KEY` | edge | `openssl rand -base64 32` | `supabase secrets set` |
| `GRAPH_WEBHOOK_CLIENT_STATE` | edge | `openssl rand -hex 32` | `supabase secrets set` |
| `GRAPH_WEBHOOK_URL` *(opt)* | edge | derived if unset | `supabase secrets set` |
| `AI_ASSISTANT_API_KEY` | edge | AI gateway (same as Lovable) | `supabase secrets set` |
| `LOVABLE_API_KEY` | edge | AI gateway | `supabase secrets set` |
| `ALLOWED_ORIGIN` *(opt)* | edge | your app origin (default `*`) | `supabase secrets set` |
| `AZURE_CLIENT_ID/_SECRET/_TENANT_ID` | edge | Entra app (existing SharePoint) | already set |
| `SP_DRIVE_ID`, `SP_ROOT_FOLDER` | edge | SharePoint drive | already set |

OAuth scopes (delegated): `Calendars.Read  Mail.Read  OnlineMeetings.Read  OnlineMeetingTranscript.Read.All  offline_access openid profile`.
