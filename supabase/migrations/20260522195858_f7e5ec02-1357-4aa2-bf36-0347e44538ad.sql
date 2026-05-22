
CREATE OR REPLACE FUNCTION public.get_graph_data(
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_limit int DEFAULT 500
)
RETURNS TABLE(nodes jsonb, edges jsonb)
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = public AS $$
DECLARE
  v_types text[] := COALESCE(
    (SELECT array_agg(value::text) FROM jsonb_array_elements_text(p_filters->'entity_types')),
    ARRAY['project','task','request','page','user']
  );
  v_rels text[] := (
    SELECT array_agg(value::text) FROM jsonb_array_elements_text(p_filters->'relation_types')
  );
  v_dept uuid := NULLIF(p_filters->>'department_id','')::uuid;
  v_has_pages boolean := to_regclass('public.pages') IS NOT NULL;
BEGIN
  RETURN QUERY
  WITH base_nodes AS (
    SELECT 'project:' || p.id::text AS id, p.id AS entity_id, 'project'::text AS type,
           p.title AS label, p.status,
           jsonb_build_object('ownerId', p.owner_id, 'progress', p.overall_percent_complete) AS metadata
      FROM public.projects p WHERE 'project' = ANY(v_types)
    UNION ALL
    SELECT 'task:' || t.id::text, t.id, 'task', t.title, t.status,
           jsonb_build_object('ownerId', t.user_id, 'dueDate', t.due_date)
      FROM public.tasks t WHERE 'task' = ANY(v_types)
    UNION ALL
    SELECT 'request:' || r.id::text, r.id, 'request', r.title, r.status,
           jsonb_build_object('artId', r.request_number, 'priority', r.priority,
                              'assigneeId', r.assignee_id, 'departmentId', r.department_id,
                              'dueDate', r.due_date)
      FROM public.requests r WHERE 'request' = ANY(v_types)
        AND (v_dept IS NULL OR r.department_id = v_dept)
    UNION ALL
    SELECT 'page:' || pg.id::text, pg.id, 'page', pg.title, NULL,
           jsonb_build_object('ownerId', pg.owner_id, 'icon', pg.icon)
      FROM public.pages pg WHERE v_has_pages AND 'page' = ANY(v_types) AND pg.archived_at IS NULL
    UNION ALL
    SELECT 'user:' || pr.user_id::text, pr.user_id, 'user', pr.full_name, NULL,
           jsonb_build_object('role', pr.role, 'departmentId', pr.department_id,
                              'avatarUrl', pr.avatar_url)
      FROM public.profiles pr WHERE 'user' = ANY(v_types) AND pr.is_active
  ),
  limited_nodes AS (SELECT * FROM base_nodes LIMIT p_limit),
  base_edges AS (
    SELECT er.id::text AS id,
           er.source_type || ':' || er.source_id::text AS source,
           er.target_type || ':' || er.target_id::text AS target,
           er.relation_type AS type
      FROM public.entity_relations er
     WHERE v_rels IS NULL OR er.relation_type = ANY(v_rels)
    UNION ALL
    SELECT 'fk:owns:'   || p.id::text, 'user:' || p.owner_id::text, 'project:' || p.id::text, 'owns'
      FROM public.projects p WHERE v_rels IS NULL OR 'owns' = ANY(v_rels)
    UNION ALL
    SELECT 'fk:taskOwner:' || t.id::text, 'task:' || t.id::text, 'user:' || t.user_id::text, 'assigned_to'
      FROM public.tasks t WHERE v_rels IS NULL OR 'assigned_to' = ANY(v_rels)
    UNION ALL
    SELECT 'fk:reqAssigned:' || r.id::text, 'request:' || r.id::text, 'user:' || r.assignee_id::text, 'assigned_to'
      FROM public.requests r WHERE r.assignee_id IS NOT NULL
        AND (v_rels IS NULL OR 'assigned_to' = ANY(v_rels))
    UNION ALL
    SELECT 'fk:stakeholder:' || s.id::text, 'user:' || s.user_id::text, 'project:' || s.project_id::text, 'stakeholder'
      FROM public.project_stakeholders s WHERE v_rels IS NULL OR 'stakeholder' = ANY(v_rels)
  )
  SELECT
    (SELECT jsonb_agg(to_jsonb(ln)) FROM limited_nodes ln),
    (SELECT jsonb_agg(to_jsonb(be))
       FROM base_edges be
      WHERE be.source IN (SELECT id FROM limited_nodes)
        AND be.target IN (SELECT id FROM limited_nodes));
END $$;

CREATE OR REPLACE FUNCTION public.expand_node(
  p_node_type text, p_node_id uuid, p_depth int DEFAULT 1
) RETURNS TABLE(nodes jsonb, edges jsonb)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public AS $$
  SELECT * FROM public.get_graph_data(
    jsonb_build_object('center_type', p_node_type, 'center_id', p_node_id, 'depth', p_depth),
    500
  );
$$;

INSERT INTO public.feature_flags (feature_key, entity_type, enabled)
VALUES ('graph','global',true)
ON CONFLICT DO NOTHING;
