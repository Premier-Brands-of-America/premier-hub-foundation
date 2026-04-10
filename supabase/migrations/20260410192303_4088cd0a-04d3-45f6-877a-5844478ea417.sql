
-- ============================================
-- STEP 1: CREATE ALL TABLES (no policies, no functions yet)
-- ============================================

-- Drop leftover objects from failed migrations
DROP TABLE IF EXISTS public.project_links CASCADE;
DROP TABLE IF EXISTS public.project_attachments CASCADE;
DROP TABLE IF EXISTS public.project_activity CASCADE;
DROP TABLE IF EXISTS public.project_updates CASCADE;
DROP TABLE IF EXISTS public.project_stakeholders CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP FUNCTION IF EXISTS public.is_project_stakeholder(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_view_project(uuid, uuid);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'complete')),
  desired_due_date date,
  updated_due_date date,
  overall_percent_complete integer,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT overall_percent_range CHECK (overall_percent_complete IS NULL OR (overall_percent_complete >= 0 AND overall_percent_complete <= 100))
);

CREATE TABLE public.project_stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  percent_complete integer,
  added_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stakeholder_unique UNIQUE (project_id, user_id),
  CONSTRAINT stakeholder_percent_range CHECK (percent_complete IS NULL OR (percent_complete >= 0 AND percent_complete <= 100))
);

CREATE TABLE public.project_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.project_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.project_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  file_type text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.project_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  url text NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- STEP 2: INDEXES AND TRIGGERS
-- ============================================
CREATE INDEX idx_projects_owner ON public.projects (owner_id);
CREATE INDEX idx_projects_status ON public.projects (status);
CREATE INDEX idx_projects_visibility ON public.projects (visibility);
CREATE INDEX idx_project_stakeholders_project ON public.project_stakeholders (project_id);
CREATE INDEX idx_project_stakeholders_user ON public.project_stakeholders (user_id);
CREATE INDEX idx_project_updates_project ON public.project_updates (project_id);
CREATE INDEX idx_project_activity_project ON public.project_activity (project_id);
CREATE INDEX idx_project_attachments_project ON public.project_attachments (project_id);
CREATE INDEX idx_project_links_project ON public.project_links (project_id);

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_project_updates_updated_at BEFORE UPDATE ON public.project_updates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- STEP 3: HELPER FUNCTIONS (all tables exist now)
-- ============================================
CREATE OR REPLACE FUNCTION public.is_project_stakeholder(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_stakeholders
    WHERE user_id = _user_id AND project_id = _project_id
  )
$$;

CREATE OR REPLACE FUNCTION public.can_view_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id
    AND (
      visibility = 'public'
      OR EXISTS (SELECT 1 FROM public.project_stakeholders WHERE project_id = _project_id AND user_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND is_admin = true)
    )
  )
$$;

-- ============================================
-- STEP 4: ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_links ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: RLS POLICIES
-- ============================================

-- projects
CREATE POLICY "Users can view projects based on visibility" ON public.projects FOR SELECT TO authenticated
USING (visibility = 'public' OR public.is_project_stakeholder(auth.uid(), id) OR public.is_admin(auth.uid()));

CREATE POLICY "Users can create projects" ON public.projects FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Stakeholders and admins can update projects" ON public.projects FOR UPDATE TO authenticated
USING (public.is_project_stakeholder(auth.uid(), id) OR public.is_admin(auth.uid()));

CREATE POLICY "Owner or admin can delete projects" ON public.projects FOR DELETE TO authenticated
USING (auth.uid() = owner_id OR public.is_admin(auth.uid()));

-- project_stakeholders
CREATE POLICY "View stakeholders if can view project" ON public.project_stakeholders FOR SELECT TO authenticated
USING (public.can_view_project(auth.uid(), project_id));

CREATE POLICY "Stakeholders and admins can add stakeholders" ON public.project_stakeholders FOR INSERT TO authenticated
WITH CHECK (public.is_project_stakeholder(auth.uid(), project_id) OR public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND owner_id = auth.uid()));

CREATE POLICY "Stakeholders and admins can update stakeholders" ON public.project_stakeholders FOR UPDATE TO authenticated
USING (public.is_project_stakeholder(auth.uid(), project_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Stakeholders and admins can remove stakeholders" ON public.project_stakeholders FOR DELETE TO authenticated
USING (public.is_project_stakeholder(auth.uid(), project_id) OR public.is_admin(auth.uid()));

-- project_updates
CREATE POLICY "View updates if can view project" ON public.project_updates FOR SELECT TO authenticated
USING (public.can_view_project(auth.uid(), project_id));

CREATE POLICY "Stakeholders and admins can add updates" ON public.project_updates FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND (public.is_project_stakeholder(auth.uid(), project_id) OR public.is_admin(auth.uid())));

CREATE POLICY "Users can edit own project updates" ON public.project_updates FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own project updates" ON public.project_updates FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- project_activity
CREATE POLICY "View activity if can view project" ON public.project_activity FOR SELECT TO authenticated
USING (public.can_view_project(auth.uid(), project_id));

CREATE POLICY "Stakeholders and admins can log activity" ON public.project_activity FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND (public.is_project_stakeholder(auth.uid(), project_id) OR public.is_admin(auth.uid())));

-- project_attachments
CREATE POLICY "View project attachments if can view project" ON public.project_attachments FOR SELECT TO authenticated
USING (public.can_view_project(auth.uid(), project_id));

CREATE POLICY "Stakeholders and admins can add project attachments" ON public.project_attachments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND (public.is_project_stakeholder(auth.uid(), project_id) OR public.is_admin(auth.uid())));

CREATE POLICY "Uploader can delete project attachments" ON public.project_attachments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- project_links
CREATE POLICY "View project links if can view project" ON public.project_links FOR SELECT TO authenticated
USING (public.can_view_project(auth.uid(), project_id));

CREATE POLICY "Stakeholders and admins can add project links" ON public.project_links FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND (public.is_project_stakeholder(auth.uid(), project_id) OR public.is_admin(auth.uid())));

CREATE POLICY "Uploader can delete project links" ON public.project_links FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- STEP 6: STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-attachments', 'project-attachments', false, 26214400,
  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','image/png','image/jpeg','text/plain','text/csv']
);

CREATE POLICY "Project stakeholders can upload attachments" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-attachments' AND public.is_project_stakeholder(auth.uid(), (storage.foldername(name))[1]::uuid));

CREATE POLICY "Users can view project attachments storage" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-attachments' AND public.can_view_project(auth.uid(), (storage.foldername(name))[1]::uuid));

CREATE POLICY "Project stakeholders can delete attachments storage" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'project-attachments' AND public.is_project_stakeholder(auth.uid(), (storage.foldername(name))[1]::uuid));
