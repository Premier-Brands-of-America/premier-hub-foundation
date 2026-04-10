
-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_date date,
  percent_complete integer,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'complete')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT percent_complete_range CHECK (percent_complete IS NULL OR (percent_complete >= 0 AND percent_complete <= 100))
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_tasks_user_id ON public.tasks (user_id);
CREATE INDEX idx_tasks_status ON public.tasks (user_id, status);
CREATE INDEX idx_tasks_due_date ON public.tasks (user_id, due_date);

-- ============================================
-- TASK CONTACTS
-- ============================================
CREATE TABLE public.task_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  contact_type text NOT NULL CHECK (contact_type IN ('internal', 'external')),
  internal_user_id uuid,
  name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own task contacts" ON public.task_contacts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_contacts.task_id AND tasks.user_id = auth.uid()));
CREATE POLICY "Users can create own task contacts" ON public.task_contacts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_contacts.task_id AND tasks.user_id = auth.uid()));
CREATE POLICY "Users can update own task contacts" ON public.task_contacts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_contacts.task_id AND tasks.user_id = auth.uid()));
CREATE POLICY "Users can delete own task contacts" ON public.task_contacts FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_contacts.task_id AND tasks.user_id = auth.uid()));

CREATE INDEX idx_task_contacts_task_id ON public.task_contacts (task_id);

-- ============================================
-- TASK UPDATES (user-authored notes)
-- ============================================
CREATE TABLE public.task_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own task updates" ON public.task_updates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_updates.task_id AND tasks.user_id = auth.uid()));
CREATE POLICY "Users can create own task updates" ON public.task_updates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_updates.task_id AND tasks.user_id = auth.uid()));
CREATE POLICY "Users can update own task updates" ON public.task_updates FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own task updates" ON public.task_updates FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_task_updates_updated_at BEFORE UPDATE ON public.task_updates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_task_updates_task_id ON public.task_updates (task_id);

-- ============================================
-- TASK ACTIVITY (automatic trail)
-- ============================================
CREATE TABLE public.task_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own task activity" ON public.task_activity FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_activity.task_id AND tasks.user_id = auth.uid()));
CREATE POLICY "Users can create own task activity" ON public.task_activity FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_activity.task_id AND tasks.user_id = auth.uid()));

CREATE INDEX idx_task_activity_task_id ON public.task_activity (task_id);

-- ============================================
-- TASK ATTACHMENTS
-- ============================================
CREATE TABLE public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  file_type text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own task attachments" ON public.task_attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_attachments.task_id AND tasks.user_id = auth.uid()));
CREATE POLICY "Users can create own task attachments" ON public.task_attachments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_attachments.task_id AND tasks.user_id = auth.uid()));
CREATE POLICY "Users can delete own task attachments" ON public.task_attachments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_task_attachments_task_id ON public.task_attachments (task_id);

-- ============================================
-- TASK LINKS
-- ============================================
CREATE TABLE public.task_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  url text NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own task links" ON public.task_links FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_links.task_id AND tasks.user_id = auth.uid()));
CREATE POLICY "Users can create own task links" ON public.task_links FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_links.task_id AND tasks.user_id = auth.uid()));
CREATE POLICY "Users can delete own task links" ON public.task_links FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_task_links_task_id ON public.task_links (task_id);

-- ============================================
-- STORAGE BUCKET for task attachments
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  false,
  26214400,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png',
    'image/jpeg',
    'text/plain',
    'text/csv'
  ]
);

-- Storage policies: only owner can access their files
CREATE POLICY "Users can upload task attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own task attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own task attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
