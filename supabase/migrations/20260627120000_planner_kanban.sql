-- Planner / Kanban revamp — buckets, kanban task fields, comment @mentions,
-- art-request routing + structured due-date justification, notification enrichment.
-- Additive & backward-compatible: existing rows keep working (sensible defaults).

-- =====================================================================
-- 1. PROJECT BUCKETS  (Project → Buckets → Tasks)
-- =====================================================================
create table if not exists public.project_buckets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  position int not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_buckets_project on public.project_buckets(project_id, position);

alter table public.project_buckets enable row level security;

drop policy if exists "view buckets if can view project" on public.project_buckets;
create policy "view buckets if can view project" on public.project_buckets
for select to authenticated using (public.can_view_project(project_id));

drop policy if exists "manage buckets if stakeholder or admin" on public.project_buckets;
create policy "manage buckets if stakeholder or admin" on public.project_buckets
for all to authenticated
using (public.is_project_stakeholder(project_id) or public.is_admin())
with check (public.is_project_stakeholder(project_id) or public.is_admin());

-- =====================================================================
-- 2. TASKS — make them Kanban-capable (all nullable / defaulted)
-- =====================================================================
alter table public.tasks
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists bucket_id uuid references public.project_buckets(id) on delete set null,
  add column if not exists position int not null default 0,
  add column if not exists priority text not null default 'medium'
    check (priority in ('low','medium','high','urgent')),
  add column if not exists assignee_id uuid references public.profiles(user_id) on delete set null,
  add column if not exists start_date date,
  add column if not exists due_reason text,
  add column if not exists due_reason_type text
    check (due_reason_type is null or due_reason_type in ('Meeting','Launch','Deadline','Other')),
  add column if not exists due_linked_event text,
  add column if not exists meeting_required boolean not null default false,
  add column if not exists checklist jsonb not null default '[]'::jsonb;

create index if not exists idx_tasks_project_bucket on public.tasks(project_id, bucket_id, position);
create index if not exists idx_tasks_assignee on public.tasks(assignee_id);

-- Project members can see/manage tasks that belong to a project they can view.
-- (Personal tasks keep the existing owner-only policies untouched.)
drop policy if exists "view project tasks" on public.tasks;
create policy "view project tasks" on public.tasks
for select to authenticated using (
  project_id is not null and public.can_view_project(project_id)
);

drop policy if exists "stakeholders manage project tasks" on public.tasks;
create policy "stakeholders manage project tasks" on public.tasks
for update to authenticated using (
  project_id is not null and public.is_project_stakeholder(project_id)
) with check (
  project_id is not null and public.is_project_stakeholder(project_id)
);

-- =====================================================================
-- 3. COMMENTS / ACTIVITY — @mention tracking on existing *_updates tables
-- =====================================================================
alter table public.project_updates
  add column if not exists mentioned_user_ids uuid[] not null default '{}';
alter table public.task_updates
  add column if not exists mentioned_user_ids uuid[] not null default '{}';

-- =====================================================================
-- 4. ART REQUESTS — routing + structured due-date + meeting + key info
-- =====================================================================
alter table public.requests
  add column if not exists customer text,
  add column if not exists assigned_manager text,   -- manager id (jaclyn/megan/dan)
  add column if not exists start_date date,
  add column if not exists due_reason text,
  add column if not exists due_reason_type text
    check (due_reason_type is null or due_reason_type in ('Meeting','Launch','Deadline','Other')),
  add column if not exists due_linked_event text,
  add column if not exists meeting_required boolean not null default false,
  add column if not exists meeting_scheduled boolean not null default false,
  add column if not exists key_points jsonb not null default '[]'::jsonb,  -- array of {point, priority}
  add column if not exists key_info jsonb not null default '{}'::jsonb;     -- structured art-request info

create index if not exists idx_requests_customer on public.requests(customer);

-- =====================================================================
-- 5. NOTIFICATIONS — source/action enrichment for deep links + dedupe
-- =====================================================================
alter table public.notifications
  add column if not exists source_entity_type text
    check (source_entity_type is null or source_entity_type in ('project','task','request')),
  add column if not exists source_entity_id uuid,
  add column if not exists action_type text;

create index if not exists idx_notifications_source
  on public.notifications(source_entity_type, source_entity_id);

-- =====================================================================
-- 6. ART OWNERSHIP MATRIX  (seedable/editable config in the DB)
-- =====================================================================
create table if not exists public.art_ownership (
  id uuid primary key default gen_random_uuid(),
  customer text not null,
  manager_id text not null,            -- jaclyn / megan / dan
  unique (customer, manager_id)
);
alter table public.art_ownership enable row level security;

drop policy if exists "ownership readable by authenticated" on public.art_ownership;
create policy "ownership readable by authenticated" on public.art_ownership
for select to authenticated using (true);

drop policy if exists "ownership writable by admin" on public.art_ownership;
create policy "ownership writable by admin" on public.art_ownership
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Seed the ownership matrix (idempotent). Mirrors src/config/artOwnership.ts.
insert into public.art_ownership (customer, manager_id) values
  ('Best Choice','jaclyn'),('CVS','jaclyn'),('Caring Mill','jaclyn'),('Kroger','jaclyn'),
  ('Premier Solutions','jaclyn'),('Quality Choice','jaclyn'),('Top Care','jaclyn'),
  ('Walmart/Equate','jaclyn'),('Winco','jaclyn'),('EndZone','jaclyn'),('Leader','jaclyn'),('Rugby','jaclyn'),
  ('Albertson''s','megan'),('Care One','megan'),('Dollar Tree','megan'),('Equaline','megan'),
  ('Family Dollar','megan'),('GNP (Good Neighbor Pharmacy)','megan'),('Harris Teeter','megan'),
  ('HEB','megan'),('Meijer','megan'),('QHP (life, Atoma, Option+, Equate, Compliments)','megan'),
  ('Rite Aid','megan'),('Target','megan'),('Walgreens','megan'),('Good Sense','megan'),
  ('Arm & Hammer','dan'),('Comfort Zone','dan'),('Corporate','dan'),('Indi Brands','dan'),
  ('Trojan','dan'),('Special Projects','dan'),
  ('Master Dielines','jaclyn'),('Master Dielines','megan'),('Master Dielines','dan')
on conflict (customer, manager_id) do nothing;
