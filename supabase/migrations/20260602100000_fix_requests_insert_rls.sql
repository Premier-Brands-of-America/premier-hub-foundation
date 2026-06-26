-- P5 fix — art-request "create request" was rejected by RLS.
--
-- Root cause: the INSERT policy required
--   department_id = public.current_department_id()
-- i.e. the request's department had to equal the requester's OWN profile
-- department. But the intake forms (EasyRequest / FullBriefRequest) intentionally
-- let a requester choose ANY department (the picker says "change if this request
-- belongs to a different department"), and any user whose profile has no
-- department makes current_department_id() return NULL — so the WITH CHECK could
-- never be satisfied and the insert failed ("new row violates row-level security
-- policy for table requests").
--
-- Fix: a requester may submit for any department, but only AS THEMSELVES. This
-- matches the UI intent and the ownership-only INSERT pattern used elsewhere, and
-- preserves security: you cannot create a request attributed to another user.
-- SELECT/UPDATE policies are unchanged (own + own-dept + designer/admin).

drop policy if exists "any authenticated can submit own" on public.requests;
create policy "any authenticated can submit own" on public.requests
for insert to authenticated with check (
  requester_id = auth.uid()
);
