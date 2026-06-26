-- ============================================================================
-- INTEG-TEAMS: Teams transcripts via Microsoft Graph
-- ----------------------------------------------------------------------------
-- Owns: graph_subscriptions, meeting_transcripts, transcript_segments
-- Consumes (read-only, NOT created here — owned by INTEG-OUTLOOK):
--   ms_connections (token store), calendar_events (join_web_url -> project_id)
-- Ordered AFTER the Outlook migration by filename prefix (20260601120000).
--
-- RLS NOTE: findings §4.3 referenced a non-existent `project_members` table.
-- This codebase has no such table. Project-scoped read visibility is expressed
-- through the existing SECURITY DEFINER helper public.can_view_project(_user_id,
-- _project_id) (public OR stakeholder OR admin) — see migration
-- 20260410193421_*.sql. We MIRROR that helper here instead of project_members.
--
-- Privileged writes (insert/update of transcripts + segments, subscription
-- bookkeeping) happen SERVER-SIDE in Edge Functions using SUPABASE_SECRET_KEY
-- (sb_secret_..., BYPASSRLS), so no client write policies are needed. Clients
-- (PAGES) only READ these tables, hence GRANT SELECT to authenticated.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- graph_subscriptions: Microsoft Graph change-notification subscriptions.
-- Graph subscriptions for getAllTranscripts expire ~3 days and are renewed by
-- the graph-renew cron. Owner-only; managed entirely server-side.
-- ----------------------------------------------------------------------------
CREATE TABLE public.graph_subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource        text NOT NULL,
  subscription_id text NOT NULL UNIQUE,
  expiration      timestamptz NOT NULL,
  client_state    text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_graph_subscriptions_user        ON public.graph_subscriptions (user_id);
CREATE INDEX idx_graph_subscriptions_expiration  ON public.graph_subscriptions (expiration);

-- ----------------------------------------------------------------------------
-- meeting_transcripts: one row per Teams meeting transcript, optionally linked
-- to a project and/or a page. summary_md + status are the shared contract that
-- PAGES renders. (Shape is EXACTLY findings §4.3 — do not add columns.)
-- ----------------------------------------------------------------------------
CREATE TABLE public.meeting_transcripts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id   uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  page_id      uuid REFERENCES public.pages(id) ON DELETE SET NULL,
  ms_meeting_id text NOT NULL,
  subject      text,
  started_at   timestamptz,
  vtt_url      text,
  summary_md   text,
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','fetched','summarized','failed'))
);

CREATE INDEX idx_meeting_transcripts_user    ON public.meeting_transcripts (user_id);
CREATE INDEX idx_meeting_transcripts_project ON public.meeting_transcripts (project_id);
CREATE INDEX idx_meeting_transcripts_page    ON public.meeting_transcripts (page_id);
CREATE INDEX idx_meeting_transcripts_meeting ON public.meeting_transcripts (ms_meeting_id);

-- ----------------------------------------------------------------------------
-- transcript_segments: speaker-tagged lines parsed from the .vtt.
-- ----------------------------------------------------------------------------
CREATE TABLE public.transcript_segments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id uuid NOT NULL REFERENCES public.meeting_transcripts(id) ON DELETE CASCADE,
  speaker       text,
  text          text,
  start_ms      int,
  end_ms        int
);

CREATE INDEX idx_transcript_segments_transcript ON public.transcript_segments (transcript_id, start_ms);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.graph_subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_transcripts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcript_segments  ENABLE ROW LEVEL SECURITY;

-- graph_subscriptions: owner-only (WITH CHECK on the owner column).
CREATE POLICY "Owner manages own graph subscriptions"
ON public.graph_subscriptions
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- meeting_transcripts: owner OR project-visible (mirrors can_view_project).
CREATE POLICY "View meeting transcripts if owner or project-visible"
ON public.meeting_transcripts
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (project_id IS NOT NULL AND public.can_view_project(auth.uid(), project_id))
);

-- transcript_segments: visible iff the parent transcript is visible.
CREATE POLICY "View transcript segments if parent transcript visible"
ON public.transcript_segments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.meeting_transcripts mt
    WHERE mt.id = transcript_segments.transcript_id
      AND (
        mt.user_id = auth.uid()
        OR (mt.project_id IS NOT NULL AND public.can_view_project(auth.uid(), mt.project_id))
      )
  )
);

-- ============================================================================
-- GRANTs — clients only READ. Privileged writes use the secret key (BYPASSRLS).
-- ============================================================================
GRANT SELECT ON public.graph_subscriptions  TO authenticated;
GRANT SELECT ON public.meeting_transcripts  TO authenticated;
GRANT SELECT ON public.transcript_segments  TO authenticated;
