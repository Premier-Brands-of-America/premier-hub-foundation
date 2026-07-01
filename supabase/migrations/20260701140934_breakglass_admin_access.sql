-- Break-glass / just-in-time admin access.
--
-- Replaces the PASSIVE admin bypass (admins used to see everyone's private
-- projects / tasks / pages by default) with an EXPLICIT, time-boxed, audited and
-- owner-notified model: an admin must request temporary access to a specific
-- item, with a reason. Access defaults to 60 minutes, is written to the audit
-- log, and the item's owner is notified. Nothing passive.
--
-- Scope = personal content only (projects, tasks, pages). The shared Art-Request
-- queue and admin/config tables (profiles, feature flags, departments, roles,
-- audit_log, org_directory) are intentionally UNCHANGED — admins keep those.
--
-- Idempotent (create or replace / if not exists / drop policy if exists).
-- NOT pushed from here — the owner runs `supabase db push`.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Helpers (part 1): target owner lookup (no dependency on the grants table)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.is_target_owner(_type text, _id uuid, _user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case _type
    when 'project' then exists (select 1 from public.projects where id = _id and owner_id = _user)
    when 'task'    then exists (select 1 from public.tasks    where id = _id and user_id  = _user)
    when 'page'    then exists (select 1 from public.pages    where id = _id and owner_id = _user)
    else false
  end
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Grants table
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.admin_access_grants (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,                                   -- auth.uid() of the admin
  target_type text not null check (target_type in ('project','task','page')),
  target_id uuid not null,
  reason text not null check (length(btrim(reason)) > 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index if not exists idx_admin_access_grants_lookup
  on public.admin_access_grants (admin_id, target_type, target_id, expires_at);

alter table public.admin_access_grants enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Helpers (part 2): active-grant check (depends on the grants table)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.has_active_admin_grant(_user_id uuid, _target_type text, _target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin(_user_id) and exists (
    select 1 from public.admin_access_grants g
    where g.admin_id = _user_id
      and g.target_type = _target_type
      and g.target_id = _target_id
      and g.revoked_at is null
      and g.expires_at > now()
  )
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Grants-table RLS policies
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "admin inserts own grant" on public.admin_access_grants;
create policy "admin inserts own grant" on public.admin_access_grants
  for insert to authenticated
  with check (public.is_admin(auth.uid()) and admin_id = auth.uid());

-- Owner transparency: the affected owner can see who accessed their item.
drop policy if exists "admin or owner reads grant" on public.admin_access_grants;
create policy "admin or owner reads grant" on public.admin_access_grants
  for select to authenticated
  using (admin_id = auth.uid() or public.is_target_owner(target_type, target_id, auth.uid()));

-- Only the granting admin may update (to set revoked_at).
drop policy if exists "admin revokes own grant" on public.admin_access_grants;
create policy "admin revokes own grant" on public.admin_access_grants
  for update to authenticated
  using (admin_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. View helpers — swap the passive admin bypass for a grant check.
--    Every OTHER clause (owner / public / manager-of / stakeholder / department /
--    page-share) is preserved exactly as in the prior migrations.
-- ─────────────────────────────────────────────────────────────────────────────

-- projects: owner + public + manager-of + stakeholder + GRANT (was: is_admin exists)
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
      or public.has_active_admin_grant(_user_id, 'project', _project_id)
    )
  )
$$;

-- tasks: owner + public + manager-of + GRANT (was: is_admin exists)
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
      or public.has_active_admin_grant(_user_id, 'task', _task_id)
    )
  )
$$;

-- pages: owner + public + manager-of + department + page-share + GRANT
-- (was: public.is_admin(_user_id)). Keeps the Feature 6 has_page_share clause.
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
      or public.has_active_admin_grant(_user_id, 'page', _page_id)
      or public.has_page_share(_user_id, _page_id, false)
    )
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Mutation bypass — silent admin edits are as invasive as viewing, so gate
--    them behind a grant too. Owner / stakeholder / lead / edit-share rights are
--    left intact; ONLY the blanket admin term is replaced.
-- ─────────────────────────────────────────────────────────────────────────────

-- tasks (from feature5): update + delete
drop policy if exists "tasks_update_own_or_admin" on public.tasks;
create policy "tasks_update_own_or_admin" on public.tasks
  for update to authenticated
  using (user_id = auth.uid() or public.has_active_admin_grant(auth.uid(), 'task', id));

drop policy if exists "tasks_delete_own_or_admin" on public.tasks;
create policy "tasks_delete_own_or_admin" on public.tasks
  for delete to authenticated
  using (user_id = auth.uid() or public.has_active_admin_grant(auth.uid(), 'task', id));

-- projects (from 20260410192303). The projects table SELECT policy is INLINE
-- (it does NOT route through can_view_project), so the helper swap in §5 would
-- not reach it — its blanket is_admin is replaced here too, otherwise admins
-- would still passively see every private project in lists. Owner + stakeholder
-- + public are preserved.
drop policy if exists "Users can view projects based on visibility" on public.projects;
create policy "Users can view projects based on visibility" on public.projects
  for select to authenticated
  using (
    visibility = 'public'
    or public.is_project_stakeholder(auth.uid(), id)
    or public.has_active_admin_grant(auth.uid(), 'project', id)
  );

drop policy if exists "Stakeholders and admins can update projects" on public.projects;
create policy "Stakeholders and admins can update projects" on public.projects
  for update to authenticated
  using (public.is_project_stakeholder(auth.uid(), id) or public.has_active_admin_grant(auth.uid(), 'project', id));

drop policy if exists "Owner or admin can delete projects" on public.projects;
create policy "Owner or admin can delete projects" on public.projects
  for delete to authenticated
  using (auth.uid() = owner_id or public.has_active_admin_grant(auth.uid(), 'project', id));

-- pages UPDATE flows through can_edit_page (Feature 6). Replace its blanket
-- is_admin with a grant; owner + edit-share rights preserved.
create or replace function public.can_edit_page(_page_id uuid, _user_id uuid)
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
      p.owner_id = _user_id
      or public.has_active_admin_grant(_user_id, 'page', _page_id)
      or public.has_page_share(_user_id, _page_id, true)
    )
  );
$$;

-- pages DELETE (from 20260522192630) uses a blanket is_admin_role() bypass;
-- replace it with a grant. Owner delete right preserved.
drop policy if exists "owner or admin deletes" on public.pages;
create policy "owner or admin deletes" on public.pages
  for delete to authenticated
  using (owner_id = auth.uid() or public.has_active_admin_grant(auth.uid(), 'page', id));

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RPC — request access (audited + owner-notified)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.request_admin_access(
  _target_type text,
  _target_id uuid,
  _reason text,
  _minutes int default 60
) returns public.admin_access_grants
language plpgsql
security definer
set search_path = public
as $$
declare
  _grant public.admin_access_grants;
  _min int;
  _expires timestamptz;
  _owner uuid;
  _actor_profile uuid;
  _admin_name text;
  _type_es text;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Not authorized: admin access required';
  end if;
  if btrim(coalesce(_reason, '')) = '' then
    raise exception 'A reason is required';
  end if;
  if _target_type not in ('project','task','page') then
    raise exception 'Invalid target_type: %', _target_type;
  end if;

  _min := least(greatest(coalesce(_minutes, 60), 5), 1440);   -- clamp to [5, 1440]
  _expires := now() + (_min || ' minutes')::interval;

  insert into public.admin_access_grants (admin_id, target_type, target_id, reason, expires_at)
  values (auth.uid(), _target_type, _target_id, btrim(_reason), _expires)
  returning * into _grant;

  -- Resolve the target's owner (mirrors is_target_owner).
  _owner := case _target_type
    when 'project' then (select owner_id from public.projects where id = _target_id)
    when 'task'    then (select user_id  from public.tasks    where id = _target_id)
    when 'page'    then (select owner_id from public.pages    where id = _target_id)
  end;

  select id, full_name into _actor_profile, _admin_name
  from public.profiles where user_id = auth.uid();

  -- Audit (actor_id references profiles.id, not user_id).
  insert into public.audit_log (actor_id, entity_type, entity_id, action, after)
  values (
    _actor_profile, _target_type, _target_id, 'admin_access_granted',
    jsonb_build_object('reason', btrim(_reason), 'expires_at', _expires, 'minutes', _min)
  );

  -- Notify the owner (skip if the admin owns the item, or the owner is unknown).
  if _owner is not null and _owner <> auth.uid() then
    _type_es := case _target_type
      when 'project' then 'proyecto'
      when 'task'    then 'tarea'
      when 'page'    then 'página'
    end;
    insert into public.notifications (user_id, type, title, message, link)
    values (
      _owner,
      'warning',
      'Un administrador accedió a tu ' || _type_es || ' para soporte',
      coalesce(_admin_name, 'Un administrador') || ': ' || btrim(_reason)
        || ' (acceso hasta ' || to_char(_expires, 'HH24:MI') || ').',
      '/' || _target_type || 's/' || _target_id
    );
  end if;

  return _grant;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. RPC — revoke access (audited)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.revoke_admin_access(_grant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _grant public.admin_access_grants;
  _actor_profile uuid;
begin
  update public.admin_access_grants
    set revoked_at = now()
    where id = _grant_id and admin_id = auth.uid() and revoked_at is null
    returning * into _grant;

  if _grant.id is null then
    return;  -- nothing revoked (not found / not owner / already revoked)
  end if;

  select id into _actor_profile from public.profiles where user_id = auth.uid();

  insert into public.audit_log (actor_id, entity_type, entity_id, action, after)
  values (
    _actor_profile, _grant.target_type, _grant.target_id, 'admin_access_revoked',
    jsonb_build_object('grant_id', _grant_id)
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Grants
-- ─────────────────────────────────────────────────────────────────────────────
grant execute on function public.is_target_owner(text, uuid, uuid) to authenticated;
grant execute on function public.has_active_admin_grant(uuid, text, uuid) to authenticated;
grant execute on function public.request_admin_access(text, uuid, text, int) to authenticated;
grant execute on function public.revoke_admin_access(uuid) to authenticated;
