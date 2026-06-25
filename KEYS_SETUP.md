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
- [ ] **2.** Supabase secret key (`sb_secret_…`) for Edge Functions
- [ ] **3.** Enable RS256 JWT signing keys (dashboard toggle)
- [ ] **4.** Microsoft Entra app — Graph scopes, client secret, redirect URI, admin consent
- [ ] **5.** Teams **application access policy** (admin PowerShell) — required for transcripts
- [ ] **6.** Generate `TOKEN_ENCRYPTION_KEY` + `GRAPH_WEBHOOK_CLIENT_STATE`
- [ ] **7.** AI gateway key (`LOVABLE_API_KEY` / `AI_ASSISTANT_API_KEY`)
- [ ] **8.** (Already set) SharePoint `AZURE_*` / `SP_*` — confirm reuse for Graph
- [ ] **9.** Set all Edge secrets, apply migrations, register the renew cron
- [ ] **🔒** Security follow-up: rotate the committed anon key + stop tracking `.env`

Your project ref is **`yogscxuhjalgwngefbta`** (URLs below use it; change if you point at a different project).

---

## 1. Client `.env` — Supabase URL + publishable key

1. `cp .env.example .env`
2. Supabase Dashboard → your project → **Settings → API** (and **Settings → API Keys**).
3. Fill in `.env`:
   - `VITE_SUPABASE_URL` = **Project URL** → `https://yogscxuhjalgwngefbta.supabase.co`
   - `VITE_SUPABASE_PROJECT_ID` = the project ref → `yogscxuhjalgwngefbta`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = the **publishable key** (`sb_publishable_…`) under
     **Settings → API Keys**. This is browser-safe and RLS-scoped.
     - *Transition note:* a legacy `anon` JWT still works today, but Supabase is
       retiring `anon`/`service_role` (new projects after Nov 1 2025 don't get them;
       full removal late 2026). Use `sb_publishable_…`.

That's all the client needs to run (`npm run dev`).

---

## 2. Supabase **secret** key for Edge Functions

Edge Functions do privileged work (decrypt tokens, write transcripts) and need the
**secret key**, never the publishable one.

1. **Settings → API Keys → Secret keys → Create new secret key** → copy the
   `sb_secret_…` value (shown once).
2. You'll set it as `SUPABASE_SECRET_KEY` in step 9.
   - *Fallback:* the functions also accept the legacy `SUPABASE_SERVICE_ROLE_KEY`
     (**Settings → API → service_role**) if you haven't migrated yet.

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

The Outlook/Teams features call Microsoft Graph on the user's behalf. You can **reuse
the existing Entra app** that already backs the SharePoint integration (the `AZURE_*`
secrets), just add the Graph pieces.

1. **Azure Portal → Microsoft Entra ID → App registrations** → open the existing app
   (or **New registration** if starting fresh).
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
5. **Authentication → Add a platform → Web → Redirect URIs**, add **exactly**:
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

The repo currently **tracks a committed `.env`** containing a live Supabase **anon/publishable**
key for project `yogscxuhjalgwngefbta`. That key is RLS-scoped and designed to be
browser-visible, so it is **not** a `service_role`-level leak — but a tracked `.env` is
still bad practice and invites a worse leak later. Recommended:

1. **Stop tracking it** (keeps your local file, removes it from the repo going forward):
   ```bash
   git rm --cached .env
   git commit -m "chore: stop tracking .env (use .env.example)"
   ```
   (`.gitignore` now ignores `.env`, `.env.*` real files, and `supabase/functions/.env`.)
2. **Rotate the anon/publishable key** in Supabase → Settings → API Keys (the old value
   remains in git history) and migrate to `sb_publishable_…`.
3. *(Optional, higher effort)* scrub `.env` from git history with `git filter-repo`.

> Ask the lead/owner before rewriting history or rotating a key other clients may use.

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
