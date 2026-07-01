-- Org chart fix:
--  (1) inactive users showed because org_directory had no active flag.
--  (2) hierarchy was broken/isolated: reports edges were built ONLY between
--      registered profiles, so unregistered M365 people (the majority) had no
--      manager edge. Rebuild get_org_chart_data over the FULL directory,
--      resolving each person's manager by ms_user_id (or email) across both
--      registered + unregistered people.

alter table public.org_directory
  add column if not exists account_enabled boolean not null default true;

create or replace function public.get_org_chart_data(
  p_filters jsonb default '{}'::jsonb, p_limit int default 2000
)
returns table (nodes jsonb, edges jsonb)
language sql stable security definer set search_path = public as $$
with od as (
  select
    o.id, o.user_id, o.ms_user_id, o.manager_ms_user_id, o.manager_email,
    o.full_name, o.mail, o.job_title, o.department, o.office_location,
    case when o.user_id is not null then 'user:' || o.user_id::text
         else 'user:dir:' || o.id::text end as node_id
  from public.org_directory o
  where coalesce(o.account_enabled, true) = true
    and (o.mail is not null or o.user_id is not null)
),
-- Registered active profiles that don't yet have an org_directory row.
prof_only as (
  select
    null::uuid as id, p.user_id, null::text as ms_user_id,
    null::text as manager_ms_user_id, p.manager_email,
    p.full_name, p.email as mail, p.title as job_title, p.department, p.office_location,
    'user:' || p.user_id::text as node_id
  from public.profiles p
  where p.is_active = true
    and not exists (select 1 from od where od.user_id = p.user_id)
),
all_people as (
  select id, user_id, ms_user_id, manager_ms_user_id, manager_email,
         full_name, mail, job_title, department, office_location, node_id from od
  union all
  select id, user_id, ms_user_id, manager_ms_user_id, manager_email,
         full_name, mail, job_title, department, office_location, node_id from prof_only
),
depts as (
  select distinct department from all_people where department is not null and department <> ''
),
user_nodes as (
  select jsonb_build_object(
    'id', ap.node_id,
    'entityId', coalesce(ap.user_id::text, ap.id::text),
    'type', 'user',
    'label', coalesce(ap.full_name, ap.mail, 'User'),
    'metadata', jsonb_build_object(
      'jobTitle', ap.job_title, 'department', ap.department,
      'officeLocation', ap.office_location, 'mail', ap.mail,
      'registered', ap.user_id is not null)
  ) as node from all_people ap
),
dept_nodes as (
  select jsonb_build_object(
    'id', 'department:' || d.department, 'entityId', d.department,
    'type', 'department', 'label', d.department, 'metadata', '{}'::jsonb
  ) as node from depts d
),
reports_edges as (
  select distinct jsonb_build_object(
    'id', 'reports-' || child.node_id,
    'source', child.node_id, 'target', mgr.node_id,
    'type', 'reports_to', 'label', 'reports to'
  ) as edge
  from all_people child
  join all_people mgr on (
        (child.manager_ms_user_id is not null and mgr.ms_user_id = child.manager_ms_user_id)
     or (child.manager_ms_user_id is null and child.manager_email is not null
         and lower(mgr.mail) = lower(child.manager_email))
  )
  where child.node_id <> mgr.node_id
),
member_edges as (
  select jsonb_build_object(
    'id', 'member-' || ap.node_id, 'source', ap.node_id,
    'target', 'department:' || ap.department, 'type', 'member_of'
  ) as edge
  from all_people ap where ap.department is not null and ap.department <> ''
)
select
  (select coalesce(jsonb_agg(node), '[]'::jsonb) from (
    select node from user_nodes union all select node from dept_nodes) n),
  (select coalesce(jsonb_agg(edge), '[]'::jsonb) from (
    select edge from reports_edges union all select edge from member_edges) e);
$$;
