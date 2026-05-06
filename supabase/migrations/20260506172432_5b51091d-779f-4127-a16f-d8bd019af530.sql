-- Departments
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

INSERT INTO public.departments (name) VALUES
  ('Marketing'),('Sales'),('Operations'),('NPD'),('Brand'),('Private Label'),('Art');

CREATE POLICY "Authenticated can view departments" ON public.departments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert departments" ON public.departments
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update departments" ON public.departments
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete departments" ON public.departments
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Profiles additions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id),
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'requester'
    CHECK (role IN ('admin','designer','requester'));

UPDATE public.profiles SET role = 'admin' WHERE is_admin = true;

-- Feature flags
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('user','department','global')),
  entity_id uuid,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id),
  UNIQUE (feature_key, entity_type, entity_id)
);
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

INSERT INTO public.feature_flags (feature_key, entity_type, entity_id, enabled)
SELECT k, 'global', NULL, true FROM unnest(ARRAY[
  'art_request_portal','sharepoint_integration','completion_summary',
  'audit_trail','file_uploads','designer_assignment','department_dashboard',
  'admin_settings','notifications','reports'
]) AS k;

CREATE POLICY "View flags targeting self/dept/global" ON public.feature_flags
  FOR SELECT TO authenticated USING (
    entity_type = 'global'
    OR (entity_type = 'user' AND entity_id = auth.uid())
    OR (entity_type = 'department' AND entity_id = (
      SELECT department_id FROM public.profiles WHERE user_id = auth.uid()
    ))
    OR public.is_admin(auth.uid())
  );
CREATE POLICY "Admins can insert flags" ON public.feature_flags
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update flags" ON public.feature_flags
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete flags" ON public.feature_flags
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all audit" ON public.audit_log
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users view own audit" ON public.audit_log
  FOR SELECT TO authenticated USING (
    actor_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Users insert own audit" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (
    actor_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );