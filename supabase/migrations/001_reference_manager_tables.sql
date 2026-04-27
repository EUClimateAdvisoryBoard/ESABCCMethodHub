-- ============================================================================
-- Reference Manager — Supabase schema extension
-- Adds literature/citation management tables to the EU Climate Policy Navigator
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.libraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.libraries ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.library_members (
  library_id UUID REFERENCES public.libraries(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('viewer', 'editor', 'admin')) DEFAULT 'viewer',
  PRIMARY KEY (library_id, user_id)
);

ALTER TABLE public.library_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own libraries"
  ON public.libraries FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id IN (SELECT library_id FROM public.library_members WHERE user_id = auth.uid())
    OR is_shared = true
  );

CREATE POLICY "Authenticated users can create libraries"
  ON public.libraries FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners can update libraries"
  ON public.libraries FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete libraries"
  ON public.libraries FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "Members can view membership"
  ON public.library_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid())
  );

CREATE POLICY "Library owners/admins can manage members"
  ON public.library_members FOR INSERT
  WITH CHECK (
    library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid())
    OR library_id IN (
      SELECT library_id FROM public.library_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Library owners/admins can update members"
  ON public.library_members FOR UPDATE
  USING (
    library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid())
    OR library_id IN (
      SELECT library_id FROM public.library_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Library owners/admins can remove members"
  ON public.library_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID REFERENCES public.libraries(id) ON DELETE CASCADE,
  csl_json JSONB NOT NULL,
  item_type TEXT NOT NULL,
  title TEXT NOT NULL,
  authors JSONB,
  year INTEGER,
  doi TEXT,
  abstract TEXT,
  container_title TEXT,
  citation_key TEXT,
  tags TEXT[],
  notes TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  fts TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(abstract, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(container_title, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(notes, '')), 'D')
  ) STORED
);

CREATE INDEX IF NOT EXISTS references_fts_idx ON public.references USING gin(fts);
CREATE UNIQUE INDEX IF NOT EXISTS references_citation_key_idx ON public.references(library_id, citation_key);
CREATE INDEX IF NOT EXISTS references_library_idx ON public.references(library_id);
CREATE INDEX IF NOT EXISTS references_doi_idx ON public.references(doi);
CREATE INDEX IF NOT EXISTS references_year_idx ON public.references(year);

ALTER TABLE public.references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_references" ON public.references FOR SELECT
  USING (
    library_id IN (SELECT library_id FROM public.library_members WHERE user_id = auth.uid())
    OR library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid())
    OR library_id IN (SELECT id FROM public.libraries WHERE is_shared = true)
  );

CREATE POLICY "write_references" ON public.references FOR INSERT
  WITH CHECK (
    library_id IN (SELECT library_id FROM public.library_members WHERE user_id = auth.uid() AND role IN ('editor', 'admin'))
    OR library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid())
  );

CREATE POLICY "update_references" ON public.references FOR UPDATE
  USING (
    library_id IN (SELECT library_id FROM public.library_members WHERE user_id = auth.uid() AND role IN ('editor', 'admin'))
    OR library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid())
  );

CREATE POLICY "delete_references" ON public.references FOR DELETE
  USING (
    library_id IN (SELECT library_id FROM public.library_members WHERE user_id = auth.uid() AND role IN ('editor', 'admin'))
    OR library_id IN (SELECT id FROM public.libraries WHERE owner_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.update_references_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS references_updated_at ON public.references;
CREATE TRIGGER references_updated_at
  BEFORE UPDATE ON public.references
  FOR EACH ROW EXECUTE FUNCTION public.update_references_updated_at();

CREATE TABLE IF NOT EXISTS public.csl_styles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  xml TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.csl_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CSL styles are viewable by everyone"
  ON public.csl_styles FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add styles"
  ON public.csl_styles FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
