-- ═══════════════════════════════════════════════════════════════════════════
-- MEMORY KNOWLEDGE GRAPH — "graphify in-app"
--
-- Turns the existing memory graph (manual [[links]] + structural FK relations)
-- into a real AI knowledge graph over the LIVE app data:
--   • pgvector embeddings for semantic memory (RAG)
--   • AI-discovered concepts + extracted/inferred relationships
--   • admin- + grant-gated visibility with an append-only access audit
--
-- Everything is RLS-scoped and privacy-first (the owner's hard requirement).
-- This migration is WRITTEN, NOT PUSHED. See MEMORY_KG.md for the owner's steps.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists vector;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. memory_concepts — the AI-discovered concept vocabulary.
--    Labels are non-sensitive, so readable by any authenticated user; writes go
--    through SECURITY DEFINER upsert / service role only.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.memory_concepts (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,
  norm_label    text unique,
  kind          text not null default 'concept',
  mention_count int  not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.memory_concepts enable row level security;

drop policy if exists "concepts readable by authenticated" on public.memory_concepts;
create policy "concepts readable by authenticated"
  on public.memory_concepts for select to authenticated using (true);
-- (no insert/update/delete policy → only service_role / SECURITY DEFINER writes)

-- Idempotent upsert used by the extraction edge function (service role) and any
-- SECURITY DEFINER caller: normalizes the label, bumps mention_count on re-see.
create or replace function public.upsert_concept(p_label text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_norm text := lower(btrim(p_label));
  v_id   uuid;
begin
  if v_norm is null or v_norm = '' then
    return null;
  end if;
  insert into public.memory_concepts (label, norm_label, mention_count)
  values (btrim(p_label), v_norm, 1)
  on conflict (norm_label) do update
    set mention_count = public.memory_concepts.mention_count + 1,
        label = excluded.label
  returning id into v_id;
  return v_id;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. entity_relations — add graphify edge metadata + allow 'concept' endpoints.
--    edge_kind classifies provenance; confidence/rationale carry the AI's reasoning.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.entity_relations
  add column if not exists edge_kind  text not null default 'MANUAL',
  add column if not exists confidence real,
  add column if not exists rationale  text;

alter table public.entity_relations drop constraint if exists entity_relations_edge_kind_check;
alter table public.entity_relations add constraint entity_relations_edge_kind_check
  check (edge_kind in ('MANUAL','STRUCTURAL','EXTRACTED','INFERRED','AMBIGUOUS'));

-- Allow concept nodes as relation endpoints (was: project/task/request/page/user).
alter table public.entity_relations drop constraint if exists entity_relations_source_type_check;
alter table public.entity_relations add constraint entity_relations_source_type_check
  check (source_type in ('project','task','request','page','user','concept'));
alter table public.entity_relations drop constraint if exists entity_relations_target_type_check;
alter table public.entity_relations add constraint entity_relations_target_type_check
  check (target_type in ('project','task','request','page','user','concept'));

create index if not exists idx_relations_edge_kind on public.entity_relations(edge_kind);

-- Polymorphic ref validation must now resolve 'concept' → memory_concepts(id).
create or replace function public.validate_entity_relation_refs()
returns trigger language plpgsql
set search_path = public as $$
declare v_src_exists boolean; v_tgt_exists boolean; v_tbl text; v_col text;
begin
  v_tbl := case new.source_type
             when 'project' then 'projects' when 'task' then 'tasks'
             when 'request' then 'requests' when 'page' then 'pages'
             when 'user' then 'profiles'   when 'concept' then 'memory_concepts' end;
  v_col := case new.source_type when 'user' then 'user_id' else 'id' end;
  execute format('select exists (select 1 from public.%I where %I = $1)', v_tbl, v_col)
    into v_src_exists using new.source_id;

  v_tbl := case new.target_type
             when 'project' then 'projects' when 'task' then 'tasks'
             when 'request' then 'requests' when 'page' then 'pages'
             when 'user' then 'profiles'   when 'concept' then 'memory_concepts' end;
  v_col := case new.target_type when 'user' then 'user_id' else 'id' end;
  execute format('select exists (select 1 from public.%I where %I = $1)', v_tbl, v_col)
    into v_tgt_exists using new.target_id;

  if not v_src_exists then raise exception 'source % % not found', new.source_type, new.source_id; end if;
  if not v_tgt_exists then raise exception 'target % % not found', new.target_type, new.target_id; end if;
  return new;
end $$;

-- can_view_entity underpins entity_relations RLS. Concepts are non-sensitive
-- labels → always viewable; every other branch is preserved from the original.
create or replace function public.can_view_entity(p_type text, p_id uuid)
returns boolean language plpgsql security definer stable
set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return false; end if;
  if p_type = 'project' then
    return public.can_view_project(v_uid, p_id);
  elsif p_type = 'task' then
    return exists (select 1 from public.tasks
                    where id = p_id and (user_id = v_uid or public.is_admin(v_uid)));
  elsif p_type = 'request' then
    return exists (select 1 from public.requests r
                    where r.id = p_id
                      and (r.requester_id = v_uid or r.assignee_id = v_uid
                           or r.department_id = public.current_department_id()
                           or public.is_designer_or_admin()));
  elsif p_type = 'page' then
    return to_regprocedure('public.can_view_page(uuid,uuid)') is null
        or (select public.can_view_page(p_id, v_uid));
  elsif p_type = 'user' then
    return true;
  elsif p_type = 'concept' then
    return true;
  end if;
  return false;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. memory_embeddings — pgvector store for semantic memory (RAG).
--    SELECT is scoped so a caller only sees a chunk if they can view the
--    underlying entity (reuses can_view_project/task/page + requests RLS +
--    owner-scoped transcripts/concepts). Writes are service-role only.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.memory_embeddings (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id   uuid not null,
  chunk_index int  not null default 0,
  chunk       text not null,
  embedding   vector(384),
  created_at  timestamptz not null default now(),
  unique (entity_type, entity_id, chunk_index)
);

create index if not exists idx_memory_embeddings_entity
  on public.memory_embeddings (entity_type, entity_id);
create index if not exists idx_memory_embeddings_vec
  on public.memory_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table public.memory_embeddings enable row level security;

drop policy if exists "view embeddings for viewable entities" on public.memory_embeddings;
create policy "view embeddings for viewable entities"
  on public.memory_embeddings for select to authenticated using (
    case entity_type
      when 'project'    then public.can_view_project(auth.uid(), entity_id)
      when 'task'       then public.can_view_task(auth.uid(), entity_id)
      when 'page'       then public.can_view_page(entity_id, auth.uid())
      when 'request'    then exists (select 1 from public.requests r where r.id = entity_id)
      when 'transcript' then exists (select 1 from public.meeting_transcripts m
                                      where m.id = entity_id and m.user_id = auth.uid())
      when 'concept'    then true
      else false
    end
  );
-- (no insert/update/delete policy → only service_role writes embeddings)

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. memory_access_grants + can_view_memory — grant-based visibility on top of
--    admin. A grant may target a user, a department, or everyone.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.memory_access_grants (
  id                    uuid primary key default gen_random_uuid(),
  grantee_user_id       uuid references auth.users(id) on delete cascade,
  grantee_department_id uuid references public.departments(id) on delete cascade,
  everyone              boolean not null default false,
  created_by            uuid references auth.users(id),
  created_at            timestamptz not null default now()
);

create index if not exists idx_memory_grants_user on public.memory_access_grants(grantee_user_id);
create index if not exists idx_memory_grants_dept on public.memory_access_grants(grantee_department_id);

alter table public.memory_access_grants enable row level security;

drop policy if exists "admins manage memory grants" on public.memory_access_grants;
create policy "admins manage memory grants"
  on public.memory_access_grants for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create or replace function public.can_view_memory(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin(_uid) or exists (
    select 1 from public.memory_access_grants g
    where g.everyone = true
       or g.grantee_user_id = _uid
       or (g.grantee_department_id is not null
           and g.grantee_department_id =
               (select department_id from public.profiles where user_id = _uid))
  )
$$;
grant execute on function public.can_view_memory(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. memory_access_log — APPEND-ONLY audit of who viewed the memory graph.
--    No update/delete policy exists (owner mandate). Admins may read it; writes
--    happen through the SECURITY DEFINER RPC below.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.memory_access_log (
  id        uuid primary key default gen_random_uuid(),
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

alter table public.memory_access_log enable row level security;

drop policy if exists "admins read memory access log" on public.memory_access_log;
create policy "admins read memory access log"
  on public.memory_access_log for select to authenticated
  using (public.is_admin(auth.uid()));
-- (deliberately NO insert/update/delete policy → append-only, writes via RPC)

create or replace function public.log_memory_view()
returns void language sql security definer set search_path = public as $$
  insert into public.memory_access_log (viewer_id) values (auth.uid());
$$;
grant execute on function public.log_memory_view() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Graph read RPCs — RLS-scoped nodes (entities + concepts) + edges with
--    edge_kind. All require can_view_memory and run SECURITY INVOKER so the
--    caller's RLS on the underlying tables is enforced.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_memory_graph(p_limit int default 600)
returns table(nodes jsonb, edges jsonb)
language plpgsql stable security invoker set search_path = public as $$
begin
  if not public.can_view_memory(auth.uid()) then
    return query select '[]'::jsonb, '[]'::jsonb;
    return;
  end if;

  return query
  with base_nodes as (
    select 'project:' || p.id::text as id, p.id as entity_id, 'project'::text as type,
           p.title as label, p.status,
           jsonb_build_object('ownerId', p.owner_id, 'progress', p.overall_percent_complete) as metadata
      from public.projects p
    union all
    select 'task:' || t.id::text, t.id, 'task', t.title, t.status,
           jsonb_build_object('ownerId', t.user_id, 'dueDate', t.due_date)
      from public.tasks t
    union all
    select 'request:' || r.id::text, r.id, 'request', r.title, r.status,
           jsonb_build_object('artId', r.request_number, 'assigneeId', r.assignee_id,
                              'departmentId', r.department_id)
      from public.requests r
    union all
    select 'page:' || pg.id::text, pg.id, 'page', pg.title, null,
           jsonb_build_object('ownerId', pg.owner_id, 'icon', pg.icon)
      from public.pages pg where pg.archived_at is null
    union all
    select 'user:' || pr.user_id::text, pr.user_id, 'user', pr.full_name, null,
           jsonb_build_object('role', pr.role, 'departmentId', pr.department_id,
                              'avatarUrl', pr.avatar_url)
      from public.profiles pr where pr.is_active
    union all
    select 'concept:' || c.id::text, c.id, 'concept', c.label, null,
           jsonb_build_object('kind', c.kind, 'mentionCount', c.mention_count) as metadata
      from public.memory_concepts c
  ),
  base_edges as (
    select er.id::text as id,
           er.source_type || ':' || er.source_id::text as source,
           er.target_type || ':' || er.target_id::text as target,
           er.relation_type as type,
           er.edge_kind, er.confidence, er.rationale
      from public.entity_relations er
  ),
  edge_ids as (
    select source as id from base_edges
    union
    select target from base_edges
  ),
  -- Deterministically keep the most useful nodes under the limit: edge-connected
  -- nodes first (so edges are not silently orphaned), then concepts (the point of
  -- the KG view), then the rest by label. Prevents the arbitrary truncation that
  -- would otherwise drop concept nodes (last in the UNION) and their edges.
  limited_nodes as (
    select bn.id, bn.entity_id, bn.type, bn.label, bn.status, bn.metadata
      from base_nodes bn
     order by (case when bn.id in (select id from edge_ids) then 0 else 1 end),
              (case when bn.type = 'concept' then 0 else 1 end),
              bn.label
     limit p_limit
  )
  select
    (select jsonb_agg(to_jsonb(ln)) from limited_nodes ln),
    (select jsonb_agg(to_jsonb(be))
       from base_edges be
      where be.source in (select id from limited_nodes)
        and be.target in (select id from limited_nodes));
end $$;
grant execute on function public.get_memory_graph(int) to authenticated;

-- Highest-degree nodes ("god nodes") — the key concepts/hubs. Degree is computed
-- from RLS-visible edges only (both endpoints must be visible to appear).
create or replace function public.memory_god_nodes(p_limit int default 8)
returns table(node_id text, node_type text, label text, degree bigint)
language plpgsql stable security invoker set search_path = public as $$
begin
  if not public.can_view_memory(auth.uid()) then return; end if;
  return query
  with nodes as (
    select 'project:' || p.id::text as id, 'project'::text as type, p.title as label
      from public.projects p
    union all select 'task:' || t.id::text, 'task', t.title from public.tasks t
    union all select 'request:' || r.id::text, 'request', r.title from public.requests r
    union all select 'page:' || pg.id::text, 'page', pg.title
      from public.pages pg where pg.archived_at is null
    union all select 'user:' || pr.user_id::text, 'user', pr.full_name
      from public.profiles pr where pr.is_active
    union all select 'concept:' || c.id::text, 'concept', c.label from public.memory_concepts c
  ),
  deg as (
    select ep as node_id, count(*)::bigint as degree from (
      select er.source_type || ':' || er.source_id::text as ep from public.entity_relations er
      union all
      select er.target_type || ':' || er.target_id::text from public.entity_relations er
    ) e group by ep
  )
  select n.id, n.type, n.label, d.degree
    from nodes n join deg d on d.node_id = n.id
   order by d.degree desc, n.label asc
   limit p_limit;
end $$;
grant execute on function public.memory_god_nodes(int) to authenticated;

-- Surprising connections — cross-entity-type EXTRACTED/INFERRED edges that link
-- otherwise-distant parts of the graph (few shared neighbours). Simple heuristic.
create or replace function public.memory_surprising_edges(p_limit int default 8)
returns table(edge_id text, source text, target text, relation_type text,
              edge_kind text, confidence real, rationale text, shared_neighbors bigint)
language plpgsql stable security invoker set search_path = public as $$
begin
  if not public.can_view_memory(auth.uid()) then return; end if;
  return query
  with e as (
    select er.id,
           er.source_type || ':' || er.source_id::text as s,
           er.target_type || ':' || er.target_id::text as t,
           er.relation_type, er.edge_kind, er.confidence, er.rationale,
           er.source_type, er.target_type
      from public.entity_relations er
     where er.edge_kind in ('EXTRACTED','INFERRED')
       and er.source_type <> er.target_type
  ),
  adj as (
    select er.source_type || ':' || er.source_id::text as a,
           er.target_type || ':' || er.target_id::text as b from public.entity_relations er
    union
    select er.target_type || ':' || er.target_id::text,
           er.source_type || ':' || er.source_id::text from public.entity_relations er
  ),
  scored as (
    select e.*,
           (select count(*) from adj x join adj y on x.b = y.b
             where x.a = e.s and y.a = e.t)::bigint as shared
      from e
  )
  select id::text, s, t, relation_type, edge_kind, confidence, rationale, shared
    from scored
   order by shared asc, confidence asc nulls last
   limit p_limit;
end $$;
grant execute on function public.memory_surprising_edges(int) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Semantic retrieval (RAG) — cosine-nearest chunks. SECURITY INVOKER so the
--    memory_embeddings SELECT policy scopes results to what the caller can view.
--    Powers memory-search + the ai-assistant "RELEVANT MEMORY" injection.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.match_memory_embeddings(
  query_embedding vector(384), match_count int default 6
)
returns table(entity_type text, entity_id uuid, chunk text, similarity real)
language sql stable security invoker set search_path = public as $$
  select me.entity_type, me.entity_id, me.chunk,
         (1 - (me.embedding <=> query_embedding))::real as similarity
    from public.memory_embeddings me
   where me.embedding is not null
   order by me.embedding <=> query_embedding
   limit greatest(1, least(match_count, 20));
$$;
grant execute on function public.match_memory_embeddings(vector, int) to authenticated;
