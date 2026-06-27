-- Feature 6 — Pages sharing with specific people.
--
-- Extends page visibility (private/department/public) with per-person grants:
-- a page owner can share a page with individual users as 'view' or 'edit'.
-- RLS honors shares for both SELECT (view/edit) and UPDATE (edit). NOT pushed.

create table if not exists public.page_shares (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  grantee_user_id uuid not null,
  role text not null default 'view' check (role in ('view', 'edit')),
  created_at timestamptz not null default now(),
  created_by uuid,
  constraint page_shares_unique unique (page_id, grantee_user_id)
);

create index if not exists idx_page_shares_page on public.page_shares (page_id);
create index if not exists idx_page_shares_grantee on public.page_shares (grantee_user_id);

alter table public.page_shares enable row level security;

-- helper: does this user have a share on the page (optionally requiring edit)?
create or replace function public.has_page_share(_user_id uuid, _page_id uuid, _need_edit boolean default false)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.page_shares s
    where s.page_id = _page_id
      and s.grantee_user_id = _user_id
      and (not _need_edit or s.role = 'edit')
  )
$$;

-- can_view_page now also honors per-person shares (keeps owner/public/department/
-- admin + manager-of-owner from Feature 5).
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
      or public.is_admin(_user_id)
      or public.has_page_share(_user_id, _page_id, false)
    )
  );
$$;

-- can_edit_page: owner, admin, or an 'edit' share.
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
      or public.is_admin(_user_id)
      or public.has_page_share(_user_id, _page_id, true)
    )
  );
$$;

-- update the pages UPDATE policy to allow edit-share grantees.
drop policy if exists "owner or admin updates" on public.pages;
create policy "owner or admin updates" on public.pages
  for update to authenticated
  using (public.can_edit_page(id, auth.uid()))
  with check (public.can_edit_page(id, auth.uid()));

-- page_shares policies: a page's owner (or admin) manages its shares; a grantee
-- may read their own grant rows.
drop policy if exists "page owner manages shares" on public.page_shares;
create policy "page owner manages shares" on public.page_shares
  for all to authenticated
  using (
    public.is_admin(auth.uid())
    or exists (select 1 from public.pages p where p.id = page_id and p.owner_id = auth.uid())
  )
  with check (
    public.is_admin(auth.uid())
    or exists (select 1 from public.pages p where p.id = page_id and p.owner_id = auth.uid())
  );

drop policy if exists "grantee reads own shares" on public.page_shares;
create policy "grantee reads own shares" on public.page_shares
  for select to authenticated
  using (grantee_user_id = auth.uid());
