
-- can_view_entity helper
CREATE OR REPLACE FUNCTION public.can_view_entity(p_type text, p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  IF p_type = 'project' THEN
    RETURN public.can_view_project(v_uid, p_id);
  ELSIF p_type = 'task' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.tasks
       WHERE id = p_id AND (user_id = v_uid OR public.is_admin(v_uid))
    );
  ELSIF p_type = 'request' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.requests r
       WHERE r.id = p_id
         AND (r.requester_id = v_uid OR r.assignee_id = v_uid
              OR r.department_id = public.current_department_id()
              OR public.is_designer_or_admin())
    );
  ELSIF p_type = 'page' THEN
    RETURN to_regprocedure('public.can_view_page(uuid,uuid)') IS NULL
        OR (SELECT public.can_view_page(p_id, v_uid));
  ELSIF p_type = 'user' THEN
    RETURN true;
  END IF;
  RETURN false;
END $$;

-- entity_relations table
CREATE TABLE IF NOT EXISTS public.entity_relations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type   text NOT NULL CHECK (source_type IN ('project','task','request','page','user')),
  source_id     uuid NOT NULL,
  target_type   text NOT NULL CHECK (target_type IN ('project','task','request','page','user')),
  target_id     uuid NOT NULL,
  relation_type text NOT NULL CHECK (relation_type IN
    ('relates_to','blocks','duplicate_of','parent_of','belongs_to','mentions')),
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (source_type, source_id, target_type, target_id, relation_type),
  CHECK (NOT (source_type = target_type AND source_id = target_id))
);

CREATE INDEX IF NOT EXISTS idx_relations_source ON public.entity_relations(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_relations_target ON public.entity_relations(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_relations_type   ON public.entity_relations(relation_type);

-- Validate polymorphic refs
CREATE OR REPLACE FUNCTION public.validate_entity_relation_refs()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public AS $$
DECLARE v_src_exists boolean; v_tgt_exists boolean; v_tbl text; v_col text;
BEGIN
  v_tbl := CASE NEW.source_type
             WHEN 'project' THEN 'projects' WHEN 'task' THEN 'tasks'
             WHEN 'request' THEN 'requests' WHEN 'page' THEN 'pages'
             WHEN 'user' THEN 'profiles' END;
  v_col := CASE NEW.source_type WHEN 'user' THEN 'user_id' ELSE 'id' END;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE %I = $1)', v_tbl, v_col)
    INTO v_src_exists USING NEW.source_id;

  v_tbl := CASE NEW.target_type
             WHEN 'project' THEN 'projects' WHEN 'task' THEN 'tasks'
             WHEN 'request' THEN 'requests' WHEN 'page' THEN 'pages'
             WHEN 'user' THEN 'profiles' END;
  v_col := CASE NEW.target_type WHEN 'user' THEN 'user_id' ELSE 'id' END;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE %I = $1)', v_tbl, v_col)
    INTO v_tgt_exists USING NEW.target_id;

  IF NOT v_src_exists THEN RAISE EXCEPTION 'source % % not found', NEW.source_type, NEW.source_id; END IF;
  IF NOT v_tgt_exists THEN RAISE EXCEPTION 'target % % not found', NEW.target_type, NEW.target_id; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_entity_relation_refs ON public.entity_relations;
CREATE TRIGGER trg_validate_entity_relation_refs
BEFORE INSERT OR UPDATE ON public.entity_relations
FOR EACH ROW EXECUTE FUNCTION public.validate_entity_relation_refs();

-- Cascade delete
CREATE OR REPLACE FUNCTION public.cascade_entity_relations()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public AS $$
BEGIN
  DELETE FROM public.entity_relations
   WHERE (source_type = TG_ARGV[0] AND source_id = OLD.id)
      OR (target_type = TG_ARGV[0] AND target_id = OLD.id);
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_cascade_relations_projects ON public.projects;
CREATE TRIGGER trg_cascade_relations_projects AFTER DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.cascade_entity_relations('project');

DROP TRIGGER IF EXISTS trg_cascade_relations_tasks ON public.tasks;
CREATE TRIGGER trg_cascade_relations_tasks AFTER DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.cascade_entity_relations('task');

DROP TRIGGER IF EXISTS trg_cascade_relations_requests ON public.requests;
CREATE TRIGGER trg_cascade_relations_requests AFTER DELETE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.cascade_entity_relations('request');

-- Audit
CREATE OR REPLACE FUNCTION public.audit_entity_relations() RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor uuid;
BEGIN
  SELECT id INTO v_actor FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  INSERT INTO public.audit_log(actor_id, entity_type, entity_id, action, before, after)
  VALUES (v_actor, 'relation', COALESCE(NEW.id, OLD.id), TG_OP,
          CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
          CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END);
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_audit_entity_relations ON public.entity_relations;
CREATE TRIGGER trg_audit_entity_relations
AFTER INSERT OR DELETE ON public.entity_relations
FOR EACH ROW EXECUTE FUNCTION public.audit_entity_relations();

-- RLS
ALTER TABLE public.entity_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view relations where both endpoints visible" ON public.entity_relations;
CREATE POLICY "view relations where both endpoints visible"
ON public.entity_relations FOR SELECT TO authenticated
USING (public.can_view_entity(source_type, source_id)
   AND public.can_view_entity(target_type, target_id));

DROP POLICY IF EXISTS "create relations if both endpoints visible" ON public.entity_relations;
CREATE POLICY "create relations if both endpoints visible"
ON public.entity_relations FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid()
        AND public.can_view_entity(source_type, source_id)
        AND public.can_view_entity(target_type, target_id));

DROP POLICY IF EXISTS "creator or admin can delete" ON public.entity_relations;
CREATE POLICY "creator or admin can delete"
ON public.entity_relations FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.is_admin_role());

-- RPCs
CREATE OR REPLACE FUNCTION public.add_relation(
  p_source_type text, p_source_id uuid,
  p_target_type text, p_target_id uuid,
  p_relation_type text
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.entity_relations(source_type, source_id, target_type, target_id, relation_type, created_by)
  VALUES (p_source_type, p_source_id, p_target_type, p_target_id, p_relation_type, auth.uid())
  ON CONFLICT (source_type, source_id, target_type, target_id, relation_type)
  DO UPDATE SET created_at = entity_relations.created_at
  RETURNING id INTO v_id;

  IF p_source_type = 'project' THEN
    BEGIN
      INSERT INTO public.project_activity(project_id, user_id, action, field_name, new_value)
      VALUES (p_source_id, auth.uid(), 'relation_added', p_relation_type,
              p_target_type || ':' || p_target_id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  ELSIF p_source_type = 'task' THEN
    BEGIN
      INSERT INTO public.task_activity(task_id, user_id, action, field_name, new_value)
      VALUES (p_source_id, auth.uid(), 'relation_added', p_relation_type,
              p_target_type || ':' || p_target_id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.remove_relation(p_id uuid)
RETURNS void LANGUAGE sql SECURITY INVOKER
SET search_path = public AS $$
  DELETE FROM public.entity_relations WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION public.bulk_add_relations(p_pairs jsonb)
RETURNS SETOF uuid LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public AS $$
DECLARE pair jsonb;
BEGIN
  FOR pair IN SELECT * FROM jsonb_array_elements(p_pairs) LOOP
    RETURN NEXT public.add_relation(
      pair->>'source_type', (pair->>'source_id')::uuid,
      pair->>'target_type', (pair->>'target_id')::uuid,
      pair->>'relation_type'
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.list_relations(p_type text, p_id uuid)
RETURNS TABLE(
  id uuid, direction text, other_type text, other_id uuid,
  relation_type text, created_at timestamptz, other_title text
) LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public AS $$
  WITH rels AS (
    SELECT er.id, 'outgoing'::text AS direction,
           er.target_type AS other_type, er.target_id AS other_id,
           er.relation_type, er.created_at
      FROM public.entity_relations er
     WHERE er.source_type = p_type AND er.source_id = p_id
    UNION ALL
    SELECT er.id, 'incoming',
           er.source_type, er.source_id,
           er.relation_type, er.created_at
      FROM public.entity_relations er
     WHERE er.target_type = p_type AND er.target_id = p_id
  )
  SELECT r.id, r.direction, r.other_type, r.other_id, r.relation_type, r.created_at,
    CASE r.other_type
      WHEN 'project' THEN (SELECT title FROM public.projects WHERE id = r.other_id)
      WHEN 'task'    THEN (SELECT title FROM public.tasks    WHERE id = r.other_id)
      WHEN 'request' THEN (SELECT title FROM public.requests WHERE id = r.other_id)
      WHEN 'user'    THEN (SELECT full_name FROM public.profiles WHERE user_id = r.other_id)
      ELSE NULL
    END AS other_title
  FROM rels r
  ORDER BY r.created_at DESC;
$$;

-- Feature flag
INSERT INTO public.feature_flags (feature_key, entity_type, enabled)
VALUES ('relations','global',true)
ON CONFLICT DO NOTHING;
