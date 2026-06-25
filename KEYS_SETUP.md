# Premier Project Hub v2 — Keys & Deploy

**Status: all credentials are configured. ✅ Nothing left for you to gather.**
What remains is build + deploy (my side) — listed in [🚀 Deploy](#-deploy-we-run-this-together)
so you have visibility.

Project ref: `yogscxuhjalgwngefbta` · Entra app: **Supabase Auth** (`444badf2-4e08-4ac3-aa47-90274c2c824c`)

---

## ✅ Configured (Azure + Supabase) — no action

- **Entra app** — Graph permissions admin-consented:
  - Delegated: `Calendars.Read`, `Mail.Read`, `OnlineMeetings.Read`,
    `OnlineMeetingTranscript.Read.All`, `offline_access`, `openid`, `profile`, `email`, `User.Read`
  - Application: `OnlineMeetingTranscript.Read.All`
  - Redirect URI added: `…/functions/v1/ms-oauth-callback` (existing `/auth/v1/callback` URIs preserved)
  - Client secret created (stored as a Supabase secret)
- **Teams application access policy** `PremierHubTranscripts` granted `-Global` for the app.
- **Edge secrets set**: `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_TENANT_ID` (`6d763199-…`),
  `MS_GRAPH_REDIRECT_URI`, `MS_GRAPH_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`,
  `GRAPH_WEBHOOK_CLIENT_STATE`, `AI_ASSISTANT_API_KEY` (OpenAI key).
- **Client `.env`** — existing Supabase URL + anon key (kept; RLS-scoped, browser-safe).
- **Pre-existing, untouched**: `LOVABLE_API_KEY` (deleted *after* the new ai-assistant deploys),
  `AZURE_*` + `SP_*` (SharePoint).

---

## AI provider — config-driven, OpenAI-compatible (no Lovable)

`ai-assistant` and (Teams) `transcribe-summarize` read the same three vars and speak the
OpenAI chat-completions API:

| Var | Default if unset | Now |
|---|---|---|
| `AI_ASSISTANT_API_KEY` | — (required) | OpenAI key (set) |
| `AI_GATEWAY_URL` | `https://api.openai.com/v1/chat/completions` | unset → OpenAI |
| `AI_MODEL` | `gpt-4o-mini` | unset → gpt-4o-mini |

**Switching providers later = a secret change only, no code:**
```
# OpenRouter
AI_GATEWAY_URL=https://openrouter.ai/api/v1/chat/completions
AI_MODEL=openai/gpt-4o      # or anthropic/claude-sonnet-4 | deepseek/deepseek-chat
```

---

## Notes

- **`SUPABASE_SERVICE_ROLE_KEY`**: auto-provided in the deployed runtime and reserved/
  deprecated — **do not set it as an edge secret** (local dev only). Functions that need a
  privileged client use the runtime-provided key.
- **RS256 JWT signing keys** *(optional)*: Dashboard → Authentication → Signing Keys →
  enable RS256. The app works without it.

---

## 🚀 Deploy (we run this together)

After the build branches merge into `feat/v2` (P4):

1. **Merge** `feat/dashboard`, `feat/graph`, `feat/pages`, `feat/integ-outlook`,
   `feat/integ-teams` → `feat/v2`.
2. **Deploy functions**: `ai-assistant` (now env-driven), `ms-oauth-start`,
   `ms-oauth-callback`, `calendar-sync`, `link-event-to-project`, `mail-search`,
   `graph-subscribe`, `graph-renew`, `graph-webhook`, `transcribe-summarize`,
   `transcript-action-items`. *(Built on the branches above; only `ai-assistant` +
   `sharepoint-provision` are on `feat/v2` today — the rest land at the P4 merge.)*
   ```bash
   supabase link --project-ref yogscxuhjalgwngefbta
   supabase functions deploy            # or per-function
   ```
3. **Apply migrations**:
   ```bash
   supabase db push
   ```
4. **Register the renew cron** (Graph subscriptions expire ~3 days):
   ```sql
   select cron.schedule('graph-renew-12h', '0 */12 * * *', $$
     select net.http_post(
       url := 'https://yogscxuhjalgwngefbta.supabase.co/functions/v1/graph-renew',
       headers := jsonb_build_object('apikey', current_setting('app.settings.service_key', true))
     ); $$);
   ```
5. **Delete `LOVABLE_API_KEY`** once the env-driven `ai-assistant` is live and verified.
