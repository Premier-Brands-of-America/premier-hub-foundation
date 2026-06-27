-- Feature 1 — richer M365 user info + Org Chart backend.
--
-- Adds profiles.office_location, an org_directory cache table (populated by the
-- graph-user-directory edge fn from Microsoft Graph), and get_org_chart_data()
-- which returns user + department nodes with reports_to / member_of edges built
-- from profiles.manager_email. NOT pushed; preview uses a seeded demo org.

alter table public.profiles
  add column if not exists office_location text;

create table if not exists public.org_directory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ms_user_id text,
  ms_tenant_id text,
  job_title text,
  department text,
  office_location text,
  mail text,
  manager_ms_user_id text,
  manager_email text,
  direct_reports_count int not null default 0,
  direct_reports jsonb not null default '[]'::jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint org_directory_user_unique unique (user_id),
  constraint org_directory_ms_user_unique unique (ms_user_id)
);

create index if not exists idx_org_directory_user on public.org_directory (user_id);
create index if not exists idx_org_directory_manager on public.org_directory (manager_ms_user_id);

alter table public.org_directory enable row level security;

-- Org info is directory-level: any authenticated user may read it; only the
-- service role (edge fn, BYPASSRLS) writes.
drop policy if exists "authenticated read org_directory" on public.org_directory;
create policy "authenticated read org_directory" on public.org_directory
  for select to authenticated using (true);

-- get_org_chart_data: user + department nodes; reports_to + member_of edges.
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
  depts as (
    select distinct department from people where department is not null and department <> ''
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
  )
  select
    (select coalesce(jsonb_agg(node), '[]'::jsonb) from (select node from user_nodes union all select node from dept_nodes) n),
    (select coalesce(jsonb_agg(edge), '[]'::jsonb) from (select edge from reports_edges union all select edge from member_edges) e);
$$;

-- Feature flags so the Org / Memory entries can be centrally toggled (default on).
-- Guarded: the client does not gate /org or /memory on these, so a schema mismatch
-- here must not abort the migration.
do $$
begin
  insert into public.feature_flags (feature_key, entity_type, enabled)
  values ('org_directory', 'global', true), ('memory_graph', 'global', true)
  on conflict do nothing;
exception when others then
  raise notice 'feature_flags seed skipped: %', sqlerrm;
end $$;
