
CREATE INDEX IF NOT EXISTS idx_tasks_due_date
  ON public.tasks(due_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_tasks_user_due
  ON public.tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_projects_desired_due
  ON public.projects(desired_due_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_projects_updated_due
  ON public.projects(updated_due_date);
CREATE INDEX IF NOT EXISTS idx_requests_due
  ON public.requests(due_date) WHERE status NOT IN ('complete','archived');

CREATE OR REPLACE VIEW public.timeline_items WITH (security_invoker = true) AS
  SELECT 'task'::text AS entity_type, t.id, t.title,
         t.due_date AS start_date, t.due_date AS end_date,
         t.status, NULL::text AS color_hint, t.user_id AS owner_id
    FROM public.tasks t WHERE t.due_date IS NOT NULL
  UNION ALL
  SELECT 'project', p.id, p.title,
         COALESCE(p.desired_due_date, p.updated_due_date),
         COALESCE(p.updated_due_date, p.desired_due_date),
         p.status, NULL, p.owner_id
    FROM public.projects p
   WHERE COALESCE(p.desired_due_date, p.updated_due_date) IS NOT NULL
  UNION ALL
  SELECT 'request', r.id, r.title,
         r.submitted_at::date, r.due_date,
         r.status, r.priority AS color_hint, r.assignee_id
    FROM public.requests r WHERE r.due_date IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_timeline(
  p_from date, p_to date, p_types text[] DEFAULT NULL
)
RETURNS TABLE(
  entity_type text, id uuid, title text,
  start_date date, end_date date,
  status text, color_hint text, owner_id uuid
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public AS $$
  SELECT ti.entity_type, ti.id, ti.title, ti.start_date, ti.end_date,
         ti.status, ti.color_hint, ti.owner_id
    FROM public.timeline_items ti
   WHERE (
       ti.start_date BETWEEN p_from AND p_to
       OR ti.end_date BETWEEN p_from AND p_to
       OR (ti.start_date < p_from AND ti.end_date > p_to)
     )
     AND (p_types IS NULL OR ti.entity_type = ANY(p_types))
   ORDER BY ti.start_date NULLS LAST;
$$;

INSERT INTO public.feature_flags (feature_key, entity_type, enabled)
VALUES ('timeline','global',true)
ON CONFLICT DO NOTHING;
