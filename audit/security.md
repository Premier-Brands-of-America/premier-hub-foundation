# Security Audit — Premier Project Hub v2 (`feat/v2`)

**Scope:** RLS on the six new tables; client-bundle secret exposure; OAuth token handling; edge-function authz vs. `verify_jwt` intent; SECURITY DEFINER safety; the open-redirect fix.
**Method:** read-only inspection of `supabase/migrations/*`, `supabase/functions/*`, `src/*`, and the built `dist/` bundle.
**Verdict:** The integration is, overall, carefully built — tokens stay server-side, edge functions authorize correctly, SECURITY DEFINER functions all pin `search_path`, RLS is enabled with `WITH CHECK` on every owner/privilege policy, and the open-redirect fix is sound. One real defense-in-depth leak (the webhook shared secret is client-readable) and one git-hygiene issue were found.

---

## Findings

### 1. `graph_subscriptions.client_state` (the global webhook secret) is readable by every authenticated user — MEDIUM
**Location:** `supabase/migrations/20260601120000_teams_transcripts.sql:121` (`GRANT SELECT ON public.graph_subscriptions TO authenticated`), in combination with the owner RLS policy at lines 85-90; secret source `supabase/functions/graph-subscribe/index.ts:37,78`; consumed at `supabase/functions/graph-webhook/index.ts:63`.

**Detail:** `client_state` stored in every `graph_subscriptions` row is the SAME single shared secret `GRAPH_WEBHOOK_CLIENT_STATE` (`graph-subscribe/index.ts:37` reads the env var and writes it into the row at line 78). `graph-webhook` (which is `verify_jwt=false`, reachable by anyone) authenticates ALL inbound Microsoft Graph notifications solely by comparing `n.clientState !== expectedClientState` (`graph-webhook/index.ts:63`).

The table is granted full-column `SELECT` to `authenticated` and RLS scopes rows to `user_id = auth.uid()`, so any logged-in user can run `select client_state from graph_subscriptions` and read the global webhook secret. With it, that user can POST forged notifications to the public `graph-webhook` endpoint carrying a valid `clientState` plus an arbitrary `subscriptionId`, causing `graph-webhook` to map it to another user and fire `transcribe-summarize` on their behalf (subscription-replay / unauthorized pipeline trigger).

This is inconsistent with the rest of the migration: `ms_connections` deliberately column-scopes its `GRANT SELECT` to EXCLUDE `refresh_token_enc` (`20260601110000_ms_oauth_calendar.sql:97-99`), and the migration's own header comment (line 18) states clients "only READ these tables" — but the grant was never restricted, and in fact the client never reads `graph_subscriptions` at all (`rg "graph_subscriptions" src/` → no hits).

**Recommendation:** This table is entirely server-managed; the client never touches it. Either (a) drop the client grant entirely — `REVOKE SELECT ON public.graph_subscriptions FROM authenticated;` — or (b) column-scope it to exclude `client_state` exactly as `ms_connections` does, e.g. `GRANT SELECT (id, user_id, resource, subscription_id, expiration, created_at) ON public.graph_subscriptions TO authenticated;`. Separately, consider per-subscription random `client_state` values rather than one global secret so a single leak cannot impersonate every subscription.

---

### 2. Root `.env` is tracked in git despite `.gitignore` — LOW
**Location:** repo root `.env` (tracked: `git ls-files --error-unmatch .env` → `.env`; last touched in commit `f227953`), vs. `.gitignore:` `.env` rule.

**Detail:** `.gitignore` lists `.env`, but the file was committed before that rule existed, so git still tracks it (gitignore does not untrack already-tracked files). The good news: this root `.env` contains ONLY public-safe values — `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY` (an `anon`-role JWT, verified by base64-decoding the payload → `"role":"anon"`), and `VITE_SUPABASE_URL`. These are designed to ship in the client bundle, so this is hygiene, not a secret exposure. Critically, the file that DOES hold real secrets — `supabase/functions/.env` (`SUPABASE_SERVICE_ROLE_KEY`, `MS_GRAPH_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`, `GRAPH_WEBHOOK_CLIENT_STATE`, `AI_ASSISTANT_API_KEY`) — is correctly git-ignored and untracked (`git check-ignore` confirms).

**Recommendation:** Untrack the root `.env` (`git rm --cached .env`) so the gitignore rule takes effect and the pattern is consistent. Keep `.env.example` as the tracked template. No key rotation needed since only public values were committed.

---

### 3. Webhook `clientState` comparison is not constant-time — LOW
**Location:** `supabase/functions/graph-webhook/index.ts:63`.

**Detail:** `n.clientState !== expectedClientState` is a short-circuiting string compare, a theoretical timing side-channel for recovering the shared secret. In practice this is low risk over the network (jitter dominates), and the function fails closed when the secret is unset (`!expectedClientState || …`). Noted mainly because finding #1 already exposes the same secret by a far easier path — fixing #1 makes this moot.

**Recommendation:** Optional. After fixing #1, a constant-time compare (e.g. hash both sides and compare digests) is a cheap hardening. Same applies to the secret-key checks in `graph-renew/index.ts:31-34` and `transcribe-summarize/index.ts:108-111`, though those secrets are not otherwise reachable.

---

## Verified correct (no action needed)

- **RLS enabled + `WITH CHECK` on all six new tables.** `dashboard_layouts` (owner-only `FOR ALL` with `WITH CHECK (user_id = auth.uid())`, migration `…dashboard_layouts.sql:18-26`); `ms_connections` and `calendar_events` (`…ms_oauth_calendar.sql:65-101`, owner `FOR ALL` + `WITH CHECK`, plus a project-visible read policy on `calendar_events`); `graph_subscriptions`, `meeting_transcripts`, `transcript_segments` (`…teams_transcripts.sql:80-123`, owner-managed with `WITH CHECK`, read scoped by `can_view_project` / parent-transcript visibility). Privileged writes for the Teams tables happen server-side with the secret key (BYPASSRLS), so the read-only client grants are appropriate (except the `client_state` column — finding #1).
- **No service-role / secret keys in the client or build.** `rg` over `src/` finds no `sb_secret_`/`SERVICE_ROLE`/`refresh_token_enc`/`TOKEN_ENCRYPTION_KEY`/`MS_GRAPH_CLIENT_SECRET`/`AI_ASSISTANT_API_KEY`. The two incidental hits are benign (`PreviewAuthContext.tsx:83` mock session string; `outlook-api.ts:10` a comment). The only env vars read client-side are `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (`client.ts:5-6`, `AIChat.tsx:82`). The built `dist/` bundle contains exactly one JWT — decoded `role: anon` — and no service-role token.
- **OAuth tokens stay server-side and encrypted at rest.** Refresh tokens are AES-256-GCM encrypted (`_shared/ms-graph.ts:154-178`) before storage; decrypt + refresh happen only in edge functions (`getAccessToken`, lines 257-300). `ms_connections` client `GRANT SELECT` column-scopes OUT `refresh_token_enc` (`…ms_oauth_calendar.sql:97-99`), and `outlook-api.ts` never selects it. Refresh-token rotation is handled (lines 292-294).
- **Edge-function authz matches `verify_jwt` intent.** `verify_jwt=true` functions (`ms-oauth-start`, `calendar-sync`, `mail-search`, `link-event-to-project`, `graph-subscribe`, `transcript-action-items`, `ai-assistant`) all derive the user id from the JWT (never from the body) and scope writes to that id; `link-event-to-project:57-66` additionally re-checks project visibility via the RLS client. The three `verify_jwt=false` functions are each independently authorized: `ms-oauth-callback` by HMAC-signed `state`, `graph-renew` (`:31-34`) and `transcribe-summarize` (`:108-111`) by the secret key, `graph-webhook` by `clientState` (see #1/#3). `config.toml` settings line up with each function's header rationale.
- **All SECURITY DEFINER functions pin `search_path = public`.** Verified across every migration (`can_view_project`, `is_project_stakeholder`, `current_department_id`, `is_admin`, feature-flag and pages helpers, etc.); function bodies are parameterized SQL with no dynamic-SQL injection surface. The `set_updated_at` trigger used by `dashboard_layouts` is the standard `new.updated_at = now()` helper.
- **No client-side-only privilege checks for data access.** `ai-assistant` reads project/task data through the caller's RLS-scoped client (`SUPABASE_ANON_KEY` + caller JWT, `ai-assistant/index.ts:258-260`), so the AI context can never exceed what RLS already allows; `can_view_diagnostics` is read from the user's own profile row server-side.
- **Open-redirect fix is sound.** Both ends enforce an `ALLOWED_APP_ORIGINS` allowlist: `ms-oauth-start` only signs an allowlisted origin into the HMAC `state` (`:55-57`), and `ms-oauth-callback` only ever redirects to an allowlisted origin, falling back to a relative `/?outlook=…` otherwise (`:35-59`). An attacker-controlled `origin` is normalized to `""` and cannot escape to an external host.
- **Known fixes verified:** art-request INSERT RLS relaxed to `requester_id = auth.uid()` only (`…fix_requests_insert_rls.sql:19-22`) — preserves "submit as yourself", no privilege gain.
