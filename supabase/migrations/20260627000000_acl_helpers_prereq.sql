-- Prereq helper functions referenced by later policies (planner_kanban, feature5_acl,
-- page_shares, project_documents) but never defined by the agents that wrote them.
-- Built on existing structures: profiles.is_admin, project_stakeholders, projects.owner_id.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $func$
  select coalesce((select is_admin from public.profiles where user_id = auth.uid()), false)
$func$;

create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $func$
  select coalesce((select is_admin from public.profiles where user_id = _user_id), false)
$func$;

create or replace function public.is_project_stakeholder(_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $func$
  select exists (select 1 from public.project_stakeholders s
                 where s.project_id = _project_id and s.user_id = auth.uid())
      or exists (select 1 from public.projects p
                 where p.id = _project_id and p.owner_id = auth.uid())
$func$;

create or replace function public.is_project_stakeholder(_user_id uuid, _project_id uuid)
returns boolean language sql stable security definer set search_path = public as $func$
  select exists (select 1 from public.project_stakeholders s
                 where s.project_id = _project_id and s.user_id = _user_id)
      or exists (select 1 from public.projects p
                 where p.id = _project_id and p.owner_id = _user_id)
$func$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.is_project_stakeholder(uuid) to authenticated;
grant execute on function public.is_project_stakeholder(uuid, uuid) to authenticated;
