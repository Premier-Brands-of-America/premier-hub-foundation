create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where user_id = auth.uid()
$$;

create or replace function public.is_admin_role()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where user_id = auth.uid()), false)
$$;

create or replace function public.is_designer_or_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin','designer') from public.profiles where user_id = auth.uid()), false)
$$;

create or replace function public.current_department_id()
returns uuid language sql stable security definer set search_path = public as $$
  select department_id from public.profiles where user_id = auth.uid()
$$;

grant execute on function public.current_role() to authenticated;
grant execute on function public.is_admin_role() to authenticated;
grant execute on function public.is_designer_or_admin() to authenticated;
grant execute on function public.current_department_id() to authenticated;