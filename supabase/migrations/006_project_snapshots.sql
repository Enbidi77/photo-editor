-- 006_project_snapshots.sql: Versioned project snapshots for history and recovery

CREATE TABLE IF NOT EXISTS public.project_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  document JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_snapshots_proj_ver ON public.project_snapshots(project_id, version DESC);

ALTER TABLE public.project_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view snapshots"
  ON public.project_snapshots FOR SELECT
  TO authenticated
  USING (public.is_project_member(project_id));

CREATE POLICY "Editors can create snapshots"
  ON public.project_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (public.is_project_editor_or_owner(project_id));
