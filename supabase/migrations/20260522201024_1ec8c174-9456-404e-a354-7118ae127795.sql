-- Search vectors
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(description, '')), 'B')
    ) STORED;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(description, '')), 'B')
    ) STORED;

ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(request_number, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(metadata::text, '')), 'C')
    ) STORED;

ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(body_text, '')), 'B')
    ) STORED;

-- Indexes (non-concurrent since migration runs in transaction)
CREATE INDEX IF NOT EXISTS idx_projects_search ON public.projects USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_tasks_search    ON public.tasks    USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_requests_search ON public.requests USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_pages_search    ON public.pages    USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_projects_title_trgm ON public.projects USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tasks_title_trgm    ON public.tasks    USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_requests_title_trgm ON public.requests USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pages_title_trgm    ON public.pages    USING GIN(title gin_trgm_ops);

-- RPCs
CREATE OR REPLACE FUNCTION public.search_all(
  p_query text, p_types text[] DEFAULT NULL, p_limit int DEFAULT 25
)
RETURNS TABLE(entity_type text, id uuid, title text, snippet text, rank real)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  WITH q AS (SELECT websearch_to_tsquery('english', p_query) AS tsq),
  hits AS (
    SELECT 'project'::text AS entity_type, p.id, p.title,
           ts_headline('english', coalesce(p.description,''), (SELECT tsq FROM q),
                       'MaxFragments=1, MaxWords=18, MinWords=5') AS snippet,
           ts_rank_cd(p.search_vector, (SELECT tsq FROM q)) AS rank
      FROM public.projects p, q
     WHERE (p_types IS NULL OR 'project' = ANY(p_types))
       AND p.search_vector @@ q.tsq
    UNION ALL
    SELECT 'task', t.id, t.title,
           ts_headline('english', coalesce(t.description,''), (SELECT tsq FROM q),
                       'MaxFragments=1, MaxWords=18, MinWords=5'),
           ts_rank_cd(t.search_vector, (SELECT tsq FROM q))
      FROM public.tasks t, q
     WHERE (p_types IS NULL OR 'task' = ANY(p_types))
       AND t.search_vector @@ q.tsq
    UNION ALL
    SELECT 'request', r.id,
           COALESCE(r.request_number || ' · ' || r.title, r.title),
           ts_headline('english', coalesce(r.description,''), (SELECT tsq FROM q),
                       'MaxFragments=1, MaxWords=18, MinWords=5'),
           ts_rank_cd(r.search_vector, (SELECT tsq FROM q))
      FROM public.requests r, q
     WHERE (p_types IS NULL OR 'request' = ANY(p_types))
       AND r.search_vector @@ q.tsq
    UNION ALL
    SELECT 'page', pg.id, pg.title,
           ts_headline('english', coalesce(pg.body_text,''), (SELECT tsq FROM q),
                       'MaxFragments=1, MaxWords=18, MinWords=5'),
           ts_rank_cd(pg.search_vector, (SELECT tsq FROM q))
      FROM public.pages pg, q
     WHERE (p_types IS NULL OR 'page' = ANY(p_types))
       AND pg.search_vector @@ q.tsq
  )
  SELECT * FROM hits
   ORDER BY rank DESC
   LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.search_fuzzy(
  p_query text, p_limit int DEFAULT 10
)
RETURNS TABLE(entity_type text, id uuid, title text, similarity real)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT entity_type, id, title, sim AS similarity FROM (
    SELECT 'project'::text AS entity_type, id, title, similarity(title, p_query) AS sim FROM public.projects
    UNION ALL
    SELECT 'task',    id, title, similarity(title, p_query) FROM public.tasks
    UNION ALL
    SELECT 'request', id, title, similarity(title, p_query) FROM public.requests
    UNION ALL
    SELECT 'page',    id, title, similarity(title, p_query) FROM public.pages
  ) s
  WHERE sim > 0.3
  ORDER BY sim DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.search_people(p_query text, p_limit int DEFAULT 10)
RETURNS TABLE(user_id uuid, full_name text, email text, role text, department text)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT user_id, full_name, email, role, department
    FROM public.profiles
   WHERE is_active
     AND (
       full_name ILIKE '%' || p_query || '%'
       OR email ILIKE '%' || p_query || '%'
       OR similarity(coalesce(full_name,''), p_query) > 0.3
     )
   ORDER BY similarity(coalesce(full_name,''), p_query) DESC NULLS LAST
   LIMIT p_limit;
$$;