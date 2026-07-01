-- Requests: the requester (owner) can edit their own request any time, and the
-- requester or an admin can delete it. (Dan: requestor can edit/delete requests.)

-- Broaden the requester UPDATE policy (was limited to submitted/waiting_on_info).
drop policy if exists "requester updates own pending" on public.requests;
drop policy if exists "requester updates own" on public.requests;
create policy "requester updates own" on public.requests
  for update to authenticated
  using (requester_id = auth.uid())
  with check (requester_id = auth.uid());

-- DELETE policy (none existed → deletes were blocked by RLS).
drop policy if exists "requester or admin deletes" on public.requests;
create policy "requester or admin deletes" on public.requests
  for delete to authenticated
  using (requester_id = auth.uid() or public.is_admin_role());
