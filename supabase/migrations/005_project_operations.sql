-- 005_project_operations.sql: Real-time operation log and audit trail

CREATE TABLE IF NOT EXISTS public.project_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  sequence BIGINT GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_operations_project_seq ON public.project_operations(project_id, sequence ASC);

ALTER TABLE public.project_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view project operations"
  ON public.project_operations FOR SELECT
  TO authenticated
  USING (public.is_project_member(project_id));

CREATE POLICY "Editors can insert operations"
  ON public.project_operations FOR INSERT
  TO authenticated
  WITH CHECK (public.is_project_editor_or_owner(project_id));
