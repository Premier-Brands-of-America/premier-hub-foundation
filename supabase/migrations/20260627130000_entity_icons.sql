-- Add optional icon (lucide key or DiceBear data-URI) to projects and tasks
alter table public.projects add column if not exists icon text;
alter table public.tasks add column if not exists icon text;
