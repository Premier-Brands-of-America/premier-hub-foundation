-- SECURITY FIX C-1 (Critical): pin `role` in the profiles self-update WITH CHECK.
--
-- The self-update policy (20260414184651) pinned is_admin / can_view_diagnostics
-- / is_active, but the `role` column was added later (20260506172432) and never
-- pinned. Because RLS on art_requests / request_attachments / entity_relations
-- gates on is_admin_role() / is_designer_or_admin() which read profiles.role, any
-- authenticated requester could run:
--     UPDATE public.profiles SET role = 'admin' WHERE user_id = auth.uid();
-- and pass RLS — a full compromise of the art-request subsystem. This re-creates
-- the policy to also pin `role` to its current value on self-update.

DROP POLICY IF EXISTS "Users can update own non-privileged fields" ON public.profiles;

CREATE POLICY "Users can update own non-privileged fields"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND is_admin = (SELECT p.is_admin FROM public.profiles p WHERE p.user_id = auth.uid())
    AND can_view_diagnostics = (SELECT p.can_view_diagnostics FROM public.profiles p WHERE p.user_id = auth.uid())
    AND is_active = (SELECT p.is_active FROM public.profiles p WHERE p.user_id = auth.uid())
    AND role = (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid())
  );
