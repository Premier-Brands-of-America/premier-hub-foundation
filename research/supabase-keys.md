# Supabase API Keys & Auth Model (2025–2026)

> Research to settle the question: "Are Supabase anon keys legacy now?" before we write
> this project's `.env` template and Edge Functions. Short answer: **yes — the JWT-based
> `anon`/`service_role` keys are legacy and on a deprecation path, replaced by new
> `sb_publishable_...` / `sb_secret_...` keys.** Details and a concrete recommendation below.

## Overview — what changed and when

Supabase is changing how API keys work to improve project security and key-management
ergonomics (instant rotation, auditing, granular scoping). The legacy JWT-based `anon` and
`service_role` keys are being replaced by two new key families: **publishable keys**
(`sb_publishable_...`) and **secret keys** (`sb_secret_...`)
([Understanding API keys](https://supabase.com/docs/guides/api/api-keys),
[Upcoming changes to Supabase API Keys · Discussion #29260](https://github.com/orgs/supabase/discussions/29260)).

Rollout timeline ([Discussion #29260](https://github.com/orgs/supabase/discussions/29260)):

- **June 17, 2025** — Early access to new API keys launched, available on all projects.
- **November 1, 2025** — New projects no longer get `anon` and `service_role` keys, and
  projects restored after this date are not restored with legacy keys.
- **Late 2026 (TBC)** — Legacy API keys will be deleted and removed from the Docs/Dashboard.

So existing projects are **not forced to migrate immediately** — both key types work
simultaneously through the transition — but the direction is clear and we should build new
work on the new keys ([Migrating to publishable and secret API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)).

## New publishable & secret keys

**Publishable keys (`sb_publishable_...`)** replace the `anon` key. They identify the public
parts of an app and are **safe to expose** in browsers, mobile/desktop apps, CLIs, GitHub
Actions, and public source. They carry the **same low privileges as the `anon` key**, so Row
Level Security (RLS) behaves identically: with no logged-in user the `anon` Postgres role
applies; once a user authenticates via Supabase Auth, the `authenticated` role applies. A
single publishable key replaces the anon key
([API keys](https://supabase.com/docs/guides/api/api-keys),
[Migrating to new API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)).

**Secret keys (`sb_secret_...`)** replace the `service_role` key. They grant **elevated,
full access** using the `service_role` Postgres role with `BYPASSRLS`, so they bypass all RLS
policies. They are meant **only for secure, developer-controlled backends**: servers, **Edge
Functions**, workers, microservices, admin panels, cron jobs, queue/data pipelines — never
the browser. You can create **multiple** secret keys (the docs recommend a separate key per
backend component to limit blast radius), and they can be created/deleted in **Settings → API
Keys**. Built-in protection: secret keys are rejected (HTTP 401) if used from a browser
(detected via `User-Agent`). Deleting a secret key is **irreversible**
([API keys](https://supabase.com/docs/guides/api/api-keys)).

| Legacy (JWT) | New | Privilege | Where |
|---|---|---|---|
| `anon` | `sb_publishable_...` | low (RLS-enforced) | client / browser |
| `service_role` | `sb_secret_...` | full (bypasses RLS) | server / Edge Functions |

**Header caveat:** the new keys are **not JWTs**, so they cannot be sent in the
`Authorization: Bearer ...` header (except when the value exactly equals the `apikey`
header). Pass the new key in the `apikey` header, and put the **user's JWT** in
`Authorization` ([Migrating to new API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys),
[API keys](https://supabase.com/docs/guides/api/api-keys)).

## Legacy `anon` / `service_role` JWT keys — deprecated?

Yes. They are explicitly **legacy** and slated for removal (see timeline above). Existing
projects keep working for now; new/restored projects after Nov 1, 2025 do not get them
([Discussion #29260](https://github.com/orgs/supabase/discussions/29260),
[Use of new API keys · Discussion #40300](https://github.com/orgs/supabase/discussions/40300)).
Migration is incremental: both key types coexist, so you swap clients one at a time, **verify
nothing still uses the legacy keys**, then **deactivate** them in **Settings → API Keys**
(reversible if you discover a stray client). Legacy keys can also be rotated via the dashboard
([Migrating to new API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys),
[Rotating Anon, Service, and JWT Secrets](https://supabase.com/docs/guides/troubleshooting/rotating-anon-service-and-jwt-secrets-1Jq6yd)).

## JWT signing keys (asymmetric RS256 / ECC)

Separate but related feature. Historically Supabase signed user JWTs **symmetrically (HS256)**
with one shared secret — verifying a token meant either holding that secret or calling the
Auth server. The new **JWT signing keys** support **asymmetric** algorithms (**RS256** default,
optionally **ECC/ES256** or **Ed25519**), using a private key to sign and a **public key to
verify** ([JWT Signing Keys](https://supabase.com/docs/guides/auth/signing-keys),
[Introducing JWT Signing Keys](https://supabase.com/blog/jwt-signing-keys)).

Why it matters for **Edge Functions**: the function can **verify a user's JWT locally**
against the project's public keys — no round-trip to Auth, lower latency, Auth off the hot
path. Public keys are published at
`https://<project-id>.supabase.co/auth/v1/.well-known/jwks.json` (cached ~10 min at the edge
plus client in-memory caching). Keys move through standby → current → previously-used →
revoked, enabling **zero-downtime rotation and revocation without redeploying** backend code
([JWT Signing Keys](https://supabase.com/docs/guides/auth/signing-keys)). Our auth is
**Microsoft Entra SSO via Supabase Auth**, so the issued session JWTs are Supabase JWTs and
benefit directly from asymmetric verification in Edge Functions. Note a known rough edge:
some reports of `401 Invalid JWT` for ES256 tokens at the Edge gateway after rotating from
HS256 — prefer **RS256** for now and test rotation
([Edge Functions: Invalid JWT with ES256 · Issue #42244](https://github.com/supabase/supabase/issues/42244)).

## Recommendation for THIS project

Current state: `VITE_SUPABASE_PUBLISHABLE_KEY` holds an **anon key** (`.env.example` says
`"your-anon-key"`); `src/integrations/supabase/client.ts` reads it for the browser client and
`src/components/AIChat.tsx` sends it as the `apikey` header to the `ai-assistant` Edge Function.

**Client `.env` (browser — committed as `.env.example`, real values in `.env`):**

- `VITE_SUPABASE_URL` — `https://<project-id>.supabase.co` (unchanged).
- `VITE_SUPABASE_PROJECT_ID` — the project ref (unchanged).
- `VITE_SUPABASE_PUBLISHABLE_KEY` — **put the new `sb_publishable_...` key here**, not the
  legacy anon key. The name already matches Supabase's terminology, and the publishable key is
  the correct public, RLS-scoped, browser-safe replacement. It is safe to ship in the bundle
  and is fine as the `apikey` header for Edge Function calls. (For a project created after
  Nov 1, 2025 there is no anon key anyway.)

**Edge Functions (server, privileged):**

- Use a **secret key (`sb_secret_...`)**, never the publishable key, for privileged
  server-side data access. Do **not** put it in any `VITE_*` var (those are bundled into the
  client). Store it as a **Supabase Function secret**, e.g.:

  ```bash
  supabase secrets set SUPABASE_SECRET_KEY=sb_secret_xxx
  ```

  On the Supabase platform the runtime also auto-provisions `SUPABASE_URL`,
  `SUPABASE_SECRET_KEYS` (named secret keys as JSON), `SUPABASE_PUBLISHABLE_KEYS`, and
  `SUPABASE_JWKS` (keys to verify user JWTs); locally `SUPABASE_SECRET_KEY` /
  `SUPABASE_PUBLISHABLE_KEY` work as single-key fallbacks
  ([Securing Edge Functions](https://supabase.com/docs/guides/functions/auth)).
- For functions acting **on behalf of a signed-in user**, keep JWT verification on
  (`verify_jwt = true`) so the Entra-issued Supabase session JWT is validated and RLS applies.
  For functions doing privileged work, set `verify_jwt = false` and authorize using the
  secret key, implementing your own checks
  ([Securing Edge Functions](https://supabase.com/docs/guides/functions/auth),
  [API keys](https://supabase.com/docs/guides/api/api-keys)).
- Enable **asymmetric JWT signing keys (RS256)** in the dashboard so user-JWT verification in
  Edge Functions is local, rotatable, and revocable
  ([JWT Signing Keys](https://supabase.com/docs/guides/auth/signing-keys)).

**Exact names to use:** client → `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`,
`VITE_SUPABASE_PUBLISHABLE_KEY` (= `sb_publishable_...`). Server/Edge Functions → secret
stored as `SUPABASE_SECRET_KEY` (= `sb_secret_...`) via `supabase secrets set`, never exposed
to the client.

## Sources

- [Understanding API keys — Supabase Docs](https://supabase.com/docs/guides/api/api-keys)
- [Migrating to publishable and secret API keys — Supabase Docs](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)
- [Upcoming changes to Supabase API Keys · Discussion #29260](https://github.com/orgs/supabase/discussions/29260)
- [Use of new API keys (replacing legacy keys) · Discussion #40300](https://github.com/orgs/supabase/discussions/40300)
- [JWT Signing Keys — Supabase Docs](https://supabase.com/docs/guides/auth/signing-keys)
- [Introducing JWT Signing Keys — Supabase Blog](https://supabase.com/blog/jwt-signing-keys)
- [Securing Edge Functions — Supabase Docs](https://supabase.com/docs/guides/functions/auth)
- [Rotating Anon, Service, and JWT Secrets — Supabase Docs](https://supabase.com/docs/guides/troubleshooting/rotating-anon-service-and-jwt-secrets-1Jq6yd)
- [Edge Functions: Invalid JWT with ES256 after rotating from HS256 · Issue #42244](https://github.com/supabase/supabase/issues/42244)
