-- Ensure profiles.user_id is unique so we can reference it
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_user_id_key'
  ) then
    alter table public.profiles add constraint profiles_user_id_key unique (user_id);
  end if;
end $$;

-- Helper: set_updated_at (alias of update_updated_at_column for spec compatibility)
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Counters table
create table if not exists public.request_counters (
  year int primary key,
  last_seq int not null default 0
);
alter table public.request_counters enable row level security;
-- Counter table is mutated only by trigger (security definer); no direct policies needed.

-- Requests table
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  request_number text unique,
  title text not null,
  description text not null,
  request_type text not null check (request_type in ('easy','full_brief')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status text not null default 'submitted' check (status in
    ('submitted','in_review','assigned','in_progress','waiting_on_info',
     'internal_review','sent_for_approval','complete','archived')),
  requester_id uuid not null references public.profiles(user_id) on delete restrict,
  department_id uuid not null references public.departments(id) on delete restrict,
  assignee_id uuid references public.profiles(user_id) on delete set null,
  due_date date,
  submitted_at timestamptz default now(),
  assigned_at timestamptz,
  completed_at timestamptz,
  archived_at timestamptz,
  sharepoint_folder_url text,
  sharepoint_folder_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_requests_status on public.requests(status);
create index if not exists idx_requests_assignee on public.requests(assignee_id);
create index if not exists idx_requests_department on public.requests(department_id);
create index if not exists idx_requests_requester on public.requests(requester_id);
create index if not exists idx_requests_due_date on public.requests(due_date);

-- Generate request number trigger
create or replace function public.generate_request_number()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_year int := extract(year from now());
  v_seq int;
begin
  insert into public.request_counters(year, last_seq) values (v_year, 0)
    on conflict (year) do nothing;
  update public.request_counters
    set last_seq = last_seq + 1
    where year = v_year
    returning last_seq into v_seq;
  new.request_number := 'ART-' || v_year || '-' || lpad(v_seq::text, 4, '0');
  return new;
end $$;

drop trigger if exists trg_generate_request_number on public.requests;
create trigger trg_generate_request_number
before insert on public.requests
for each row when (new.request_number is null)
execute function public.generate_request_number();

-- updated_at trigger
drop trigger if exists trg_requests_updated_at on public.requests;
create trigger trg_requests_updated_at
before update on public.requests
for each row execute function public.set_updated_at();

-- Audit trigger reusing audit_log
create or replace function public.audit_requests()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid;
begin
  select id into v_actor from public.profiles where user_id = auth.uid() limit 1;
  insert into public.audit_log(actor_id, entity_type, entity_id, action, before, after)
  values (
    v_actor,
    'request',
    coalesce(new.id, old.id),
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

drop trigger if exists trg_audit_requests on public.requests;
create trigger trg_audit_requests
after insert or update or delete on public.requests
for each row execute function public.audit_requests();

-- RLS
alter table public.requests enable row level security;

drop policy if exists "requesters see own and own dept" on public.requests;
create policy "requesters see own and own dept" on public.requests
for select to authenticated using (
  requester_id = auth.uid()
  or department_id = public.current_department_id()
  or public.is_designer_or_admin()
);

drop policy if exists "any authenticated can submit own" on public.requests;
create policy "any authenticated can submit own" on public.requests
for insert to authenticated with check (
  requester_id = auth.uid()
  and department_id = public.current_department_id()
);

drop policy if exists "requester updates own pending" on public.requests;
create policy "requester updates own pending" on public.requests
for update to authenticated using (
  requester_id = auth.uid() and status in ('submitted','waiting_on_info')
) with check (
  requester_id = auth.uid() and status in ('submitted','waiting_on_info')
);

drop policy if exists "designers update assigned" on public.requests;
create policy "designers update assigned" on public.requests
for update to authenticated using (
  public.is_designer_or_admin() and (public.is_admin_role() or assignee_id = auth.uid())
) with check (
  public.is_designer_or_admin() and (public.is_admin_role() or assignee_id = auth.uid())
);

-- DELETE intentionally not allowed (no policy = no access).