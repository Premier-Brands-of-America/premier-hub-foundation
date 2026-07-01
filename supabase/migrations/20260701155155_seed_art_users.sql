-- Seed the 3 real Art Department managers into org_directory, and wire the
-- art-request → assignee/notification path in the DB.
--
-- Context:
--   * org_directory.user_id was NOT NULL → auth.users, so unregistered people
--     (Jaclyn, Megan) could not be represented. We relax it to nullable so the
--     directory can hold external/not-yet-registered people keyed by email.
--   * org_directory had no display-name column; we add full_name so the Org
--     Chart can label directory-only people.
--   * get_org_chart_data() only surfaced rows from profiles. We union in
--     directory-only people (org_directory rows with no matching profile) so
--     the 3 managers appear in the chart before they register.
--   * A SECURITY DEFINER BEFORE-INSERT trigger on requests resolves the assigned
--     manager (metadata.manager_email → profiles) into assignee_id and inserts a
--     notification for that user. It must be SECURITY DEFINER because the
--     notifications RLS insert policy only allows a user to insert rows for
--     themselves (or admins); the requester is neither.
--
-- Idempotent. NOT pushed — Edwin applies via supabase db push.

-- ── 1. org_directory: allow directory-only (unregistered) people ─────────────
alter table public.org_directory alter column user_id drop not null;
alter table public.org_directory add column if not exists full_name text;

-- Case-insensitive unique on mail so upserts-by-email are idempotent.
create unique index if not exists org_directory_mail_unique
  on public.org_directory (lower(mail))
  where mail is not null;

-- ── 2. Seed the 3 art managers (idempotent) ──────────────────────────────────
-- Matches by lower(mail); links user_id to an existing profile when the email is
-- already registered (Dan). No duplicate profile rows are created here.
do $$
declare
  r record;
  v_user_id  uuid;
  v_existing uuid; -- id of an org_directory row already representing this person
begin
  for r in (
    select * from (values
      ('jbaum@premier-brands.com',      'Jaclyn Baum'),
      ('moettinger@premier-brands.com', 'Megan Oettinger'),
      ('ddelello@premier-brands.com',   'Dan De Lello')
    ) as t(mail, full_name)
  ) loop
    -- Link to a registered profile if one exists for this email (Dan).
    select p.user_id into v_user_id
      from public.profiles p
      where lower(p.email) = lower(r.mail)
      limit 1;

    -- Find an existing row by email OR (when registered) by user_id, so a row a
    -- prior Graph sync created under a different/absent mail is updated in place
    -- rather than colliding with org_directory_user_unique.
    select od.id into v_existing
      from public.org_directory od
      where lower(od.mail) = lower(r.mail)
         or (v_user_id is not null and od.user_id = v_user_id)
      limit 1;

    if v_existing is not null then
      update public.org_directory
        set full_name  = r.full_name,
            mail       = r.mail,
            department = 'Art',
            job_title  = coalesce(job_title, 'Creative Manager'),
            user_id    = coalesce(v_user_id, user_id),
            synced_at  = now()
        where id = v_existing;
    else
      insert into public.org_directory (user_id, full_name, mail, department, job_title)
      values (v_user_id, r.full_name, r.mail, 'Art', 'Creative Manager');
    end if;
  end loop;
end $$;

-- ── 3. Surface directory-only people in the org chart ────────────────────────
-- Additive rewrite of get_org_chart_data: same profile-derived nodes/edges as
-- before, plus user nodes for org_directory rows that have a mail with no
-- matching profile (so unregistered directory people appear, grouped by dept).
create or replace function public.get_org_chart_data(p_filters jsonb default '{}'::jsonb, p_limit int default 1000)
returns table (nodes jsonb, edges jsonb)
language sql
stable
security definer
set search_path = public
as $$
  with people as (
    select p.user_id, p.full_name, p.email, p.title, p.department, p.office_location, p.manager_email
    from public.profiles p
    where p.is_active = true
    limit p_limit
  ),
  dir_only as (
    -- Directory people not backed by a profile row (e.g. not-yet-registered).
    select od.id, od.full_name, od.mail, od.job_title, od.department, od.office_location, od.manager_email
    from public.org_directory od
    where od.mail is not null
      and not exists (select 1 from people pe where lower(pe.email) = lower(od.mail))
  ),
  depts as (
    select distinct department from (
      select department from people where department is not null and department <> ''
      union
      select department from dir_only where department is not null and department <> ''
    ) d
  ),
  user_nodes as (
    select jsonb_build_object(
      'id', 'user:' || pe.user_id,
      'entityId', pe.user_id,
      'type', 'user',
      'label', coalesce(pe.full_name, pe.email, 'User'),
      'metadata', jsonb_build_object(
        'jobTitle', pe.title, 'department', pe.department,
        'officeLocation', pe.office_location, 'mail', pe.email)
    ) as node from people pe
  ),
  dir_nodes as (
    select jsonb_build_object(
      'id', 'user:dir:' || d.id,
      'entityId', d.id,
      'type', 'user',
      'label', coalesce(d.full_name, d.mail, 'User'),
      'metadata', jsonb_build_object(
        'jobTitle', d.job_title, 'department', d.department,
        'officeLocation', d.office_location, 'mail', d.mail, 'registered', false)
    ) as node from dir_only d
  ),
  dept_nodes as (
    select jsonb_build_object(
      'id', 'department:' || d.department, 'entityId', d.department,
      'type', 'department', 'label', d.department, 'metadata', '{}'::jsonb
    ) as node from depts d
  ),
  reports_edges as (
    select jsonb_build_object(
      'id', 'reports-' || pe.user_id,
      'source', 'user:' || pe.user_id,
      'target', 'user:' || mgr.user_id,
      'type', 'reports_to', 'label', 'reports to'
    ) as edge
    from people pe
    join public.profiles mgr on lower(mgr.email) = lower(pe.manager_email)
    where pe.manager_email is not null
  ),
  member_edges as (
    select jsonb_build_object(
      'id', 'member-' || pe.user_id,
      'source', 'user:' || pe.user_id,
      'target', 'department:' || pe.department,
      'type', 'member_of'
    ) as edge
    from people pe where pe.department is not null and pe.department <> ''
  ),
  dir_member_edges as (
    select jsonb_build_object(
      'id', 'member-dir-' || d.id,
      'source', 'user:dir:' || d.id,
      'target', 'department:' || d.department,
      'type', 'member_of'
    ) as edge
    from dir_only d where d.department is not null and d.department <> ''
  )
  select
    (select coalesce(jsonb_agg(node), '[]'::jsonb) from (
      select node from user_nodes
      union all select node from dir_nodes
      union all select node from dept_nodes) n),
    (select coalesce(jsonb_agg(edge), '[]'::jsonb) from (
      select edge from reports_edges
      union all select edge from member_edges
      union all select edge from dir_member_edges) e);
$$;

-- ── 4. Assign the request + notify the manager on INSERT ─────────────────────
-- The client resolves the owning manager's email into metadata.manager_email
-- (from config/artOwnership). This trigger looks up a registered profile by that
-- email; if found it becomes the assignee and receives an in-app notification.
-- If not found (unregistered manager) assignee stays null — see BLOCKERS.md for
-- the Graph Mail.Send path that still needs building for those.
create or replace function public.assign_manager_and_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email    text := nullif(new.metadata->>'manager_email', '');
  v_customer text := nullif(new.metadata->>'customer', '');
  v_uid      uuid;
begin
  if v_email is not null then
    select p.user_id into v_uid
      from public.profiles p
      where lower(p.email) = lower(v_email)
        and coalesce(p.is_active, true) = true
      limit 1;

    if v_uid is not null then
      new.assignee_id := v_uid;
      new.assigned_at := coalesce(new.assigned_at, now());

      -- Don't notify the requester if they assigned to themselves.
      if v_uid <> new.requester_id then
        insert into public.notifications (user_id, type, title, message, link)
        values (
          v_uid,
          'info',
          'Nuevo art request asignado',
          new.title || case when v_customer is not null then ' · ' || v_customer else '' end,
          '/requests/' || new.id
        );
      end if;
    end if;
  end if;
  return new;
end $$;

-- Fires before generate_request_number (alphabetical) — order is irrelevant as
-- they touch different columns. INSERT-only, so it never fires twice per request.
drop trigger if exists trg_assign_manager_and_notify on public.requests;
create trigger trg_assign_manager_and_notify
before insert on public.requests
for each row execute function public.assign_manager_and_notify();
