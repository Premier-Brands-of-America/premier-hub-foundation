
-- Add edited_by column to project_updates
ALTER TABLE public.project_updates ADD COLUMN edited_by uuid DEFAULT NULL;

-- Allow any stakeholder to edit any update on a project (Phase 1 rule)
DROP POLICY IF EXISTS "Users can edit own project updates" ON public.project_updates;
CREATE POLICY "Stakeholders and admins can edit project updates"
ON public.project_updates
FOR UPDATE
TO authenticated
USING (
  is_project_stakeholder(auth.uid(), project_id) OR is_admin(auth.uid())
);
