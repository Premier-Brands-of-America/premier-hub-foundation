# Memory Knowledge Graph — "graphify in-app"

Turns the existing memory graph (manual `[[links]]` + structural FK relations)
into a real AI knowledge graph over the **live, RLS-scoped** app data:

- **Concepts & relationships are AI-discovered** from page/request/task/transcript
  content (Claude via `AI_ASSISTANT_API_KEY`).
- **Semantic memory (RAG)** via free `gte-small` embeddings (384-dim, no key) —
  the AI assistant retrieves the most relevant passages before answering.
- **Insights**: key concepts (god nodes), surprising connections (with the AI's
  rationale), and on-demand per-topic wiki summaries.
- **Privacy-first**: admin- + grant-gated, RLS-scoped everywhere, with an
  append-only view audit log.

Everything is **written, not deployed**. This file lists the exact infra steps
the owner (Edwin) must run.

---

## Architecture

### Phase 1 — Schema (`supabase/migrations/20260701180000_memory_kg.sql`)
- `create extension vector` (pgvector).
- `entity_relations` gains `edge_kind` (`MANUAL|STRUCTURAL|EXTRACTED|INFERRED|AMBIGUOUS`),
  `confidence`, `rationale`, and allows `concept` endpoints. `validate_entity_relation_refs`
  + `can_view_entity` updated for the `concept` type.
- `memory_concepts` — AI concept vocabulary (readable by authenticated; writes via
  `upsert_concept` SECURITY DEFINER / service role).
- `memory_embeddings` — `vector(384)` store, ivfflat cosine index; SELECT RLS reuses
  `can_view_project/task/page` + requests RLS + owner-scoped transcripts/concepts; writes service-role only.
- `memory_access_grants` + `can_view_memory(_uid)` — admin OR active grant (user / department / everyone).
- `memory_access_log` — **append-only** (no update/delete policy); `log_memory_view()` RPC inserts.
- Read RPCs (SECURITY INVOKER, RLS-scoped, gated by `can_view_memory`): `get_memory_graph`,
  `memory_god_nodes`, `memory_surprising_edges`, and `match_memory_embeddings` (RAG).

### Phase 2 — Extraction (`supabase/functions/memory-extract`)
- Dual auth: service secret (backfill + any entity) **or** authenticated user
  (single entity they can see; admins may backfill). `verify_jwt = false`.
- Input: `{entity_type, entity_id}` or `{backfill:true, limit, entity_type?}`.
- Claude extracts `{concepts[], relations[]}` (strict JSON); upserts `memory_concepts`,
  inserts `entity_relations` (entity→concept `mentions`, concept→concept EXTRACTED/INFERRED),
  idempotent via the table's UNIQUE key. Computes `gte-small` embeddings (chunked) → `memory_embeddings`.

### Phase 3 — Semantic memory (RAG)
- `supabase/functions/memory-search` — embeds the query, calls `match_memory_embeddings`
  under the caller's JWT (RLS-scoped). `verify_jwt = true`.
- `ai-assistant` — `retrieveMemory()` runs per message (not cached), injects a
  `--- RELEVANT MEMORY (semantic) ---` section ahead of the recent lists. Skips gracefully if empty.

### Phase 4 — Graph UI + insights (`/memory`)
- Route gated by `useCanViewMemory` (admin OR grant) via `MemoryRouteGuard`, which logs the view.
- Concept nodes + provenance edge styling (EXTRACTED solid, INFERRED dashed, AMBIGUOUS dotted;
  STRUCTURAL/MANUAL as before) — `edgeDash()` in `graphColors.ts`, `GraphCanvas`.
- `MemoryInsightsPanel`: key concepts, surprising connections (+ rationale), per-topic
  wiki (`memory-wiki` fn), and an admin "Rebuild memory" button (fires `memory-extract` backfill).
- Admin Settings → **Memory access** tab: grant view by user / department / everyone.

### Save triggers (fire-and-forget, production only)
`fireMemoryExtract()` is called after saving a page (`savePageBody`), request
(`createRequest`/`updateRequest`), and task (`createTask`/`updateTask`).

### Preview
`isPreviewEnvironment()` builds a demo knowledge graph (`memoryGraphDemo.ts`) with
concepts + EXTRACTED/INFERRED edges; insights are computed from it via the shared
selectors in `src/lib/memoryKg.ts` (also unit-tested).

---

## OWNER INFRA STEPS (run these to go live)

1. **Apply the migration** (installs pgvector + all tables/functions):
   ```bash
   supabase db push
   ```
   > Requires the `vector` extension to be available on the project (Supabase has it).

2. **Deploy the edge functions**:
   ```bash
   supabase functions deploy memory-extract memory-search memory-wiki
   # ai-assistant was edited (RAG retrieval) — redeploy it too:
   supabase functions deploy ai-assistant
   ```

3. **Secrets** (already used by existing functions; confirm they're set):
   - `AI_ASSISTANT_API_KEY`, `AI_GATEWAY_URL`, `AI_MODEL`
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY`
   - `gte-small` embeddings need no key (Supabase built-in AI).

4. **Backfill the graph** — click **Rebuild memory** on `/memory` (admin), or:
   ```bash
   curl -X POST "$SUPABASE_URL/functions/v1/memory-extract" \
     -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
     -H "Content-Type: application/json" \
     -d '{"backfill":true,"limit":50}'
   ```

5. **Grant access** (optional) — Admin Settings → Memory access. Admins always have access.

### Verification
- `npx tsc --noEmit` — green.
- `npm run build` — green.
- `npm test` — 162 tests pass (25 new in `src/lib/memoryKg.test.ts`).
