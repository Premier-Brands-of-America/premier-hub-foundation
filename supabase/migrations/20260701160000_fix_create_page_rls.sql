-- Fix: creating a page failed in production with
--   "new row violates row-level security policy for table pages" (403 on rpc/create_page).
-- Root cause is one of: (a) the "create own pages" INSERT policy missing in prod, or
-- (b) the WITH CHECK (owner_id = auth.uid()) evaluating against a NULL owner_id.
-- Robust fix (standard Supabase pattern for create RPCs): make create_page
-- SECURITY DEFINER so the INSERT is not blocked by RLS, while STILL stamping
-- owner_id = auth.uid() and guarding against an unauthenticated call. Also
-- re-assert the INSERT policy idempotently so direct inserts keep working.

-- Re-assert the INSERT policy (covers the "missing in prod" hypothesis).
alter table public.pages enable row level security;
drop policy if exists "create own pages" on public.pages;
create policy "create own pages" on public.pages
  for insert to authenticated
  with check (owner_id = auth.uid());

-- Redefine create_page as SECURITY DEFINER with an explicit auth guard.
create or replace function public.create_page(
  p_title text, p_parent_id uuid default null, p_visibility text default 'private'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid; v_slug text; v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if coalesce(p_visibility, 'private') not in ('public','private','department') then
    p_visibility := 'private';
  end if;
  v_slug := lower(regexp_replace(coalesce(p_title, 'untitled'), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  insert into public.pages(title, slug, parent_id, owner_id, visibility)
  values (coalesce(p_title, 'Untitled'), v_slug, p_parent_id, v_uid, coalesce(p_visibility, 'private'))
  returning id into v_id;
  return v_id;
end $$;

grant execute on function public.create_page(text, uuid, text) to authenticated;
