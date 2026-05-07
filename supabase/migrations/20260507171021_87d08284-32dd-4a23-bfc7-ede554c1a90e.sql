
-- 1. Extend departments table
alter table public.departments add column if not exists is_active boolean not null default true;
alter table public.departments add column if not exists display_order int;
alter table public.departments add column if not exists updated_at timestamptz not null default now();

-- 2. Mark old rows inactive (preserve FK integrity)
update public.departments set is_active = false
where name not in (
  'Art','Engineering','Finance','Human Resources','Information Technology',
  'Inventory','Maintenance','Marketing','Production','Purchasing','Quality',
  'Regulatory','Sales and Customer Service','Shipping'
);

-- Upsert canonical 14
insert into public.departments (name, is_active, display_order) values
  ('Art', true, 10),
  ('Engineering', true, 20),
  ('Finance', true, 30),
  ('Human Resources', true, 40),
  ('Information Technology', true, 50),
  ('Inventory', true, 60),
  ('Maintenance', true, 70),
  ('Marketing', true, 80),
  ('Production', true, 90),
  ('Purchasing', true, 100),
  ('Quality', true, 110),
  ('Regulatory', true, 120),
  ('Sales and Customer Service', true, 130),
  ('Shipping', true, 140)
on conflict (name) do update
  set is_active = excluded.is_active,
      display_order = excluded.display_order,
      updated_at = now();

-- 3. Audit trigger
create or replace function public.audit_departments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
begin
  select id into v_actor from public.profiles where user_id = auth.uid() limit 1;
  insert into public.audit_log(actor_id, entity_type, entity_id, action, before, after)
  values (
    v_actor,
    'department',
    coalesce(new.id, old.id),
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

drop trigger if exists trg_audit_departments on public.departments;
create trigger trg_audit_departments
after insert or update or delete on public.departments
for each row execute function public.audit_departments();

-- 4. updated_at maintenance
drop trigger if exists trg_departments_updated_at on public.departments;
create trigger trg_departments_updated_at
before update on public.departments
for each row execute function public.set_updated_at();

-- 6. Active dropdown view
create or replace view public.active_departments as
select id, name, display_order
from public.departments
where is_active = true
order by display_order, name;

grant select on public.active_departments to authenticated;

-- Profile self-update policy: tighten so users can't change role/is_admin/is_active/can_view_diagnostics
-- (Existing "Users can update own non-privileged fields" already covers this — no duplicate.)
