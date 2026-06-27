-- Feature 5 — ACL / row-level visibility (projects, tasks, pages).
--
-- Model: a user sees an item if they are owner / project-lead / assignee /
-- stakeholder / member, OR the item is public. Managers (per the M365 hierarchy,
-- profiles.manager_email) additionally see items belonging to their direct
-- reports. Admins see everything. New items default to private.
--
-- Helper functions are SECURITY DEFINER + STABLE and use EXISTS subqueries (no
-- N+1 joins) so they're cheap inside RLS policies. NOT pushed from here.

-- ── tasks: add a visibility column (default private), mirroring projects ──
alter table public.tasks
  add column if not exists visibility text not null default 'private'
  check (visibility in ('public', 'private'));

-- ── manager hierarchy lookup (M365): is _user_id the manager of _target? ──
-- True when _target's manager_email matches _user_id's email (case-insensitive).
create or replace function public.is_manager_of(_user_id uuid, _target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles t
    join public.profiles m on lower(t.manager_email) = lower(m.email)
    where t.user_id = _target
      and m.user_id = _user_id
      and t.manager_email is not null
  )
$$;

-- speed up the manager join + email lookups used by is_manager_of
create index if not exists idx_profiles_manager_email_lower on public.profiles (lower(manager_email));
create index if not exists idx_profiles_email_lower on public.profiles (lower(email));

-- ── projects: owner + stakeholder + public + admin + manager-of-report ──
create or replace function public.can_view_project(_user_id uuid, _project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects p
    where p.id = _project_id
    and (
      p.visibility = 'public'
      or p.owner_id = _user_id
      or public.is_manager_of(_user_id, p.owner_id)
      or exists (
        select 1 from public.project_stakeholders s
        where s.project_id = _project_id
          and (s.user_id = _user_id or public.is_manager_of(_user_id, s.user_id))
      )
      or exists (select 1 from public.profiles pr where pr.user_id = _user_id and pr.is_admin = true)
    )
  )
$$;

-- ── tasks: owner + public + admin + manager-of-owner ──
create or replace function public.can_view_task(_user_id uuid, _task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tasks t
    where t.id = _task_id
    and (
      t.visibility = 'public'
      or t.user_id = _user_id
      or public.is_manager_of(_user_id, t.user_id)
      or exists (select 1 from public.profiles pr where pr.user_id = _user_id and pr.is_admin = true)
    )
  )
$$;

-- enable RLS + policies on tasks (idempotent)
alter table public.tasks enable row level security;

drop policy if exists "tasks_select_visible" on public.tasks;
create policy "tasks_select_visible" on public.tasks
  for select to authenticated
  using (public.can_view_task(auth.uid(), id));

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "tasks_update_own_or_admin" on public.tasks;
create policy "tasks_update_own_or_admin" on public.tasks
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "tasks_delete_own_or_admin" on public.tasks;
create policy "tasks_delete_own_or_admin" on public.tasks
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- ── pages: keep existing (public/owner/department/admin) + manager-of-owner ──
create or replace function public.can_view_page(_page_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pages p
    where p.id = _page_id
    and (
      p.visibility = 'public'
      or p.owner_id = _user_id
      or public.is_manager_of(_user_id, p.owner_id)
      or (p.visibility = 'department'
          and p.department_id = (select department_id from public.profiles where user_id = _user_id))
      or public.is_admin(_user_id)
    )
  );
$$;
