-- Feature 3 — Project documents.
--
-- A richer "Documents" surface for projects (uploader + date + type + size),
-- distinct from the lightweight project_attachments list. New table +
-- 'project-documents' Storage bucket, mirroring the project_attachments RLS so
-- visibility follows can_view_project / is_project_stakeholder. NOT pushed.

create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  uploaded_by uuid not null,
  file_name text not null,
  file_type text not null,
  size_bytes bigint not null default 0,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_project_documents_project on public.project_documents (project_id);

alter table public.project_documents enable row level security;

drop policy if exists "view project documents if can view project" on public.project_documents;
create policy "view project documents if can view project" on public.project_documents
  for select to authenticated
  using (public.can_view_project(auth.uid(), project_id));

drop policy if exists "stakeholders add project documents" on public.project_documents;
create policy "stakeholders add project documents" on public.project_documents
  for insert to authenticated
  with check (
    auth.uid() = uploaded_by
    and (public.is_project_stakeholder(auth.uid(), project_id) or public.is_admin(auth.uid()))
  );

drop policy if exists "uploader or admin deletes project documents" on public.project_documents;
create policy "uploader or admin deletes project documents" on public.project_documents
  for delete to authenticated
  using (auth.uid() = uploaded_by or public.is_admin(auth.uid()));

-- Storage bucket (private). Folder layout: {project_id}/{timestamp}-{filename}.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-documents', 'project-documents', false, 26214400,
  array[
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png','image/jpeg','image/gif','image/webp','text/plain','text/csv','application/zip'
  ]
)
on conflict (id) do nothing;

drop policy if exists "upload project documents storage" on storage.objects;
create policy "upload project documents storage" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-documents' and public.is_project_stakeholder(auth.uid(), (storage.foldername(name))[1]::uuid));

drop policy if exists "view project documents storage" on storage.objects;
create policy "view project documents storage" on storage.objects
  for select to authenticated
  using (bucket_id = 'project-documents' and public.can_view_project(auth.uid(), (storage.foldername(name))[1]::uuid));

drop policy if exists "delete project documents storage" on storage.objects;
create policy "delete project documents storage" on storage.objects
  for delete to authenticated
  using (bucket_id = 'project-documents' and public.is_project_stakeholder(auth.uid(), (storage.foldername(name))[1]::uuid));
