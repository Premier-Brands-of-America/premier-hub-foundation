-- ============================================================================
-- INTEG-OUTLOOK — MS Graph OAuth token store + Outlook calendar events
-- ----------------------------------------------------------------------------
-- Shared MS-Graph foundation. INTEG-TEAMS consumes `ms_connections` (the single
-- per-user token store) and reads `calendar_events` (to associate transcripts
-- with the right project via join_web_url / project_id). Neither agent writes
-- the other's tables.
--
-- Columns follow research/findings.md §4.3 verbatim. Additions over the sketch:
--   * UNIQUE (user_id) on ms_connections        — one MS connection per user
--                                                  (enables clean upsert on
--                                                  re-consent; the _shared
--                                                  ms-graph helper reads a single
--                                                  row per user).
--   * UNIQUE (user_id, ms_event_id) on calendar_events — enables idempotent
--                                                  upsert from `calendar-sync`.
--   * supporting indexes.
--
-- RLS / visibility correction: findings §4.3 referenced a `project_members`
-- table that does NOT exist in this database. Project-scoped visibility here
-- MIRRORS the real pattern used by tasks/project_updates/project_stakeholders:
-- the SECURITY DEFINER helper `public.can_view_project(_user_id, _project_id)`
-- (defined in migration 20260410192303_…).
--
-- refresh_token_enc is encrypted at rest (AES-256-GCM) by the Edge Functions
-- using TOKEN_ENCRYPTION_KEY; it is NEVER decrypted client-side. Client SELECT
-- is column-scoped to EXCLUDE refresh_token_enc (see GRANTs below).
-- ============================================================================

-- ─── ms_connections : per-user Graph OAuth tokens ───────────────────────────
CREATE TABLE IF NOT EXISTS public.ms_connections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ms_tenant_id      text NOT NULL,
  ms_user_id        text NOT NULL,
  refresh_token_enc bytea NOT NULL,        -- encrypted; only Edge Functions decrypt
  scopes            text[] NOT NULL,
  expires_at        timestamptz,
  created_at        timestamptz DEFAULT now(),
  CONSTRAINT ms_connections_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_ms_connections_user ON public.ms_connections (user_id);

-- ─── calendar_events : Outlook events linked to projects ────────────────────
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ms_event_id  text NOT NULL,
  subject      text,
  join_web_url text,
  start_at     timestamptz,
  end_at       timestamptz,
  project_id   uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  CONSTRAINT calendar_events_user_event_unique UNIQUE (user_id, ms_event_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user    ON public.calendar_events (user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_project ON public.calendar_events (project_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start   ON public.calendar_events (start_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.ms_connections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- ms_connections : owner-only for every operation
DROP POLICY IF EXISTS "own_ms_connections" ON public.ms_connections;
CREATE POLICY "own_ms_connections" ON public.ms_connections
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- calendar_events : owner full control …
DROP POLICY IF EXISTS "own_calendar_events" ON public.calendar_events;
CREATE POLICY "own_calendar_events" ON public.calendar_events
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- … plus read access to anyone who can view the linked project (shared
-- visibility), mirroring the project_updates/tasks pattern.
DROP POLICY IF EXISTS "view_project_calendar_events" ON public.calendar_events;
CREATE POLICY "view_project_calendar_events" ON public.calendar_events
  FOR SELECT TO authenticated
  USING (project_id IS NOT NULL AND public.can_view_project(auth.uid(), project_id));

-- ============================================================================
-- GRANTS
--   ms_connections : column-scoped SELECT that EXCLUDES refresh_token_enc, so a
--   user can detect / inspect / disconnect their own connection without ever
--   reading the (encrypted) token blob. INSERT/UPDATE of tokens happen
--   server-side only via the secret key.
--   calendar_events : full CRUD (RLS scopes it to owner / project-visible).
-- ============================================================================
GRANT SELECT (id, user_id, ms_tenant_id, ms_user_id, scopes, expires_at, created_at),
      DELETE
  ON public.ms_connections TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
