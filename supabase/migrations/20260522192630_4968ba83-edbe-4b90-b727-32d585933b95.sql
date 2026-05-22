
CREATE TABLE IF NOT EXISTS public.pages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  slug          text UNIQUE,
  body          jsonb NOT NULL DEFAULT '{}'::jsonb,
  body_md       text,
  body_text     text,
  parent_id     uuid REFERENCES public.pages(id) ON DELETE CASCADE,
  owner_id      uuid NOT NULL REFERENCES auth.users(id),
  visibility    text NOT NULL DEFAULT 'private'
                CHECK (visibility IN ('public','private','department')),
  department_id uuid REFERENCES public.departments(id),
  icon          text,
  cover_url     text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  archived_at   timestamptz
);
CREATE INDEX IF NOT EXISTS idx_pages_parent ON public.pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_pages_owner  ON public.pages(owner_id);

CREATE TABLE IF NOT EXISTS public.page_links (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  target_type    text NOT NULL CHECK (target_type IN ('page','project','task','request','user')),
  target_id      uuid NOT NULL,
  anchor_text    text,
  position       int,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_page_id, target_type, target_id, position)
);
CREATE INDEX IF NOT EXISTS idx_page_links_target ON public.page_links(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_page_links_source ON public.page_links(source_page_id);

CREATE TABLE IF NOT EXISTS public.page_activity (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  action      text NOT NULL,
  field_name  text,
  old_value   text,
  new_value   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- can_view_page helper
CREATE OR REPLACE FUNCTION public.can_view_page(_page_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pages p
     WHERE p.id = _page_id
       AND (
         p.visibility = 'public'
         OR p.owner_id = _user_id
         OR (p.visibility = 'department'
             AND p.department_id = (SELECT department_id FROM public.profiles WHERE user_id = _user_id))
         OR public.is_admin(_user_id)
       )
  );
$$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.pages_set_updated_at() RETURNS trigger LANGUAGE plpgsql
SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_pages_updated_at ON public.pages;
CREATE TRIGGER trg_pages_updated_at BEFORE UPDATE ON public.pages
FOR EACH ROW EXECUTE FUNCTION public.pages_set_updated_at();

-- Extraction trigger
CREATE OR REPLACE FUNCTION public.extract_page_links()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m text[]; pos int := 0;
BEGIN
  DELETE FROM public.page_links WHERE source_page_id = NEW.id;
  DELETE FROM public.entity_relations
   WHERE source_type = 'page' AND source_id = NEW.id AND relation_type = 'mentions';

  FOR m IN
    SELECT regexp_matches(COALESCE(NEW.body_md, ''),
                          '\[\[(page|project|task|request|user):([0-9a-fA-F-]{36})\]\]', 'g')
  LOOP
    pos := pos + 1;
    INSERT INTO public.page_links(source_page_id, target_type, target_id, position)
    VALUES (NEW.id, m[1], m[2]::uuid, pos);

    INSERT INTO public.entity_relations(source_type, source_id, target_type, target_id, relation_type, created_by)
    VALUES ('page', NEW.id, m[1], m[2]::uuid, 'mentions', NEW.owner_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  NEW.body_text := regexp_replace(COALESCE(NEW.body_md, ''),
                                  '\[\[[a-z]+:[0-9a-fA-F-]{36}\]\]', ' ', 'g');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_extract_page_links ON public.pages;
CREATE TRIGGER trg_extract_page_links
BEFORE INSERT OR UPDATE OF body_md, body ON public.pages
FOR EACH ROW EXECUTE FUNCTION public.extract_page_links();

-- RLS
ALTER TABLE public.pages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_links    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view page if can_view_page" ON public.pages;
CREATE POLICY "view page if can_view_page" ON public.pages
FOR SELECT TO authenticated USING (public.can_view_page(id, auth.uid()));

DROP POLICY IF EXISTS "create own pages" ON public.pages;
CREATE POLICY "create own pages" ON public.pages
FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "owner or admin updates" ON public.pages;
CREATE POLICY "owner or admin updates" ON public.pages
FOR UPDATE TO authenticated
USING (owner_id = auth.uid() OR public.is_admin_role())
WITH CHECK (owner_id = auth.uid() OR public.is_admin_role());

DROP POLICY IF EXISTS "owner or admin deletes" ON public.pages;
CREATE POLICY "owner or admin deletes" ON public.pages
FOR DELETE TO authenticated
USING (owner_id = auth.uid() OR public.is_admin_role());

DROP POLICY IF EXISTS "view page_links if source visible" ON public.page_links;
CREATE POLICY "view page_links if source visible" ON public.page_links
FOR SELECT TO authenticated USING (public.can_view_page(source_page_id, auth.uid()));

DROP POLICY IF EXISTS "view page_activity if page visible" ON public.page_activity;
CREATE POLICY "view page_activity if page visible" ON public.page_activity
FOR SELECT TO authenticated USING (public.can_view_page(page_id, auth.uid()));

-- RPCs
CREATE OR REPLACE FUNCTION public.get_backlinks(p_target_type text, p_target_id uuid)
RETURNS TABLE(source_page_id uuid, source_title text, snippet text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public AS $$
  SELECT pl.source_page_id,
         p.title,
         ts_headline('english', COALESCE(p.body_text, ''),
                     plainto_tsquery('english', p.title),
                     'MaxFragments=1, MaxWords=20, MinWords=5'),
         pl.created_at
    FROM public.page_links pl
    JOIN public.pages p ON p.id = pl.source_page_id
   WHERE pl.target_type = p_target_type
     AND pl.target_id = p_target_id
   ORDER BY pl.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_page_tree(p_root_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid, title text, parent_id uuid, icon text, depth int)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public AS $$
  WITH RECURSIVE tree AS (
    SELECT p.id, p.title, p.parent_id, p.icon, 0 AS depth
      FROM public.pages p
     WHERE p.archived_at IS NULL
       AND (
         (p_root_id IS NULL AND p.parent_id IS NULL)
         OR (p_root_id IS NOT NULL AND p.id = p_root_id)
       )
    UNION ALL
    SELECT p.id, p.title, p.parent_id, p.icon, t.depth + 1
      FROM public.pages p
      JOIN tree t ON p.parent_id = t.id
     WHERE p.archived_at IS NULL
  )
  SELECT t.id, t.title, t.parent_id, t.icon, t.depth FROM tree t ORDER BY t.depth, t.title;
$$;

CREATE OR REPLACE FUNCTION public.create_page(
  p_title text, p_parent_id uuid DEFAULT NULL, p_visibility text DEFAULT 'private'
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public AS $$
DECLARE v_id uuid; v_slug text;
BEGIN
  v_slug := lower(regexp_replace(p_title, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  INSERT INTO public.pages(title, slug, parent_id, owner_id, visibility)
  VALUES (p_title, v_slug, p_parent_id, auth.uid(), p_visibility)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Feature flag
INSERT INTO public.feature_flags (feature_key, entity_type, enabled)
VALUES ('pages','global',true)
ON CONFLICT DO NOTHING;
