-- Art team seed. Run AFTER first SSO login so auth.users rows exist for these emails.
-- Alternative: use Supabase admin invite + service-role key.

with dept as (
  insert into public.departments (name)
  values ('Art')
  on conflict do nothing
  returning id
), art as (
  select id from dept
  union all
  select id from public.departments where name = 'Art' limit 1
)
update public.profiles p set
  role = v.role,
  department = 'Art',
  department_id = (select id from art limit 1),
  is_active = true,
  is_admin = (v.role = 'admin')
from (values
  ('dan@premierbrandsny.com',  'admin'),
  ('jaclyn@premierbrandsny.com','designer'),
  ('megan@premierbrandsny.com', 'designer')
) as v(email, role)
where lower(p.email) = lower(v.email);
