-- 004_project_assets.sql: Image assets metadata table and RLS

CREATE TABLE IF NOT EXISTS public.project_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  size_bytes BIGINT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_assets_project_id ON public.project_assets(project_id);

ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view project assets"
  ON public.project_assets FOR SELECT
  TO authenticated
  USING (public.is_project_member(project_id));

CREATE POLICY "Editors can insert project assets"
  ON public.project_assets FOR INSERT
  TO authenticated
  WITH CHECK (public.is_project_editor_or_owner(project_id));

CREATE POLICY "Editors can delete project assets"
  ON public.project_assets FOR DELETE
  TO authenticated
  USING (public.is_project_editor_or_owner(project_id));
