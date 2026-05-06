-- Table
create table public.request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  kind text not null check (kind in ('submission','reference','working','review','approval','final')),
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index idx_request_attachments_request on public.request_attachments(request_id);

alter table public.request_attachments enable row level security;

-- SELECT
create policy "view attachments if can view request"
on public.request_attachments for select
to authenticated
using (
  exists (
    select 1 from public.requests r
    where r.id = request_attachments.request_id
      and ( r.requester_id = auth.uid()
            or r.department_id = public.current_department_id()
            or public.is_designer_or_admin() )
  )
);

-- INSERT — requester restricted
create policy "requester uploads to own (submission/reference)"
on public.request_attachments for insert
to authenticated
with check (
  uploaded_by = (select id from public.profiles where user_id = auth.uid())
  and kind in ('submission','reference')
  and exists (
    select 1 from public.requests r
    where r.id = request_id and r.requester_id = auth.uid()
  )
);

-- INSERT — designer/admin
create policy "designer/admin uploads any kind"
on public.request_attachments for insert
to authenticated
with check (
  uploaded_by = (select id from public.profiles where user_id = auth.uid())
  and public.is_designer_or_admin()
);

-- DELETE
create policy "uploader recent or admin can delete"
on public.request_attachments for delete
to authenticated
using (
  public.is_admin_role()
  or (
    uploaded_by = (select id from public.profiles where user_id = auth.uid())
    and created_at > now() - interval '5 minutes'
  )
);

-- Audit trigger (reuse existing audit fn pattern)
create or replace function public.audit_request_attachments()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_actor uuid;
begin
  select id into v_actor from public.profiles where user_id = auth.uid() limit 1;
  insert into public.audit_log(actor_id, entity_type, entity_id, action, before, after)
  values (
    v_actor, 'request_attachment', coalesce(new.id, old.id), tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger trg_audit_request_attachments
after insert or update or delete on public.request_attachments
for each row execute function public.audit_request_attachments();

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('art-requests', 'art-requests', false)
on conflict (id) do nothing;

-- Storage policies
create policy "auth read art-requests if can view request"
on storage.objects for select to authenticated
using (
  bucket_id = 'art-requests'
  and exists (
    select 1 from public.request_attachments a
    join public.requests r on r.id = a.request_id
    where a.storage_path = name
      and ( r.requester_id = auth.uid()
            or r.department_id = public.current_department_id()
            or public.is_designer_or_admin() )
  )
);

create policy "auth upload art-requests"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'art-requests'
  and (storage.foldername(name))[1] = 'requests'
);

create policy "auth update own art-requests"
on storage.objects for update to authenticated
using (bucket_id = 'art-requests' and owner = auth.uid());

create policy "auth delete own art-requests or admin"
on storage.objects for delete to authenticated
using (
  bucket_id = 'art-requests'
  and (owner = auth.uid() or public.is_admin_role())
);