-- Editable dashboard: per-user widget layout (single JSON row per user).
-- Each layout entry is a saved-view widget { id, type, config, x, y, w, h };
-- the array lives in `layout` (jsonb). See DASHBOARD spec §3b / §2 #7.

CREATE TABLE IF NOT EXISTS public.dashboard_layouts (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  layout     jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Keep updated_at fresh server-side (shared helper, see requests migration).
DROP TRIGGER IF EXISTS trg_dashboard_layouts_updated_at ON public.dashboard_layouts;
CREATE TRIGGER trg_dashboard_layouts_updated_at
BEFORE UPDATE ON public.dashboard_layouts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: a user may only ever see/write their own layout row.
ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own dashboard layout" ON public.dashboard_layouts;
CREATE POLICY "own dashboard layout"
ON public.dashboard_layouts FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_layouts TO authenticated;
