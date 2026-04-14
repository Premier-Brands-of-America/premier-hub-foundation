-- Fix 1: Prevent privilege escalation via self-profile update
DROP POLICY "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update own non-privileged fields"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND is_admin = (SELECT p.is_admin FROM public.profiles p WHERE p.user_id = auth.uid())
    AND can_view_diagnostics = (SELECT p.can_view_diagnostics FROM public.profiles p WHERE p.user_id = auth.uid())
    AND is_active = (SELECT p.is_active FROM public.profiles p WHERE p.user_id = auth.uid())
  );

-- Fix 2: Add URL scheme constraints on link tables
ALTER TABLE public.project_links ADD CONSTRAINT project_links_url_safe_scheme CHECK (url ~ '^https?://');
ALTER TABLE public.task_links ADD CONSTRAINT task_links_url_safe_scheme CHECK (url ~ '^https?://');