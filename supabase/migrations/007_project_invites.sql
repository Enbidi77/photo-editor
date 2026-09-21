-- 007_project_invites.sql: Pending email invitations

CREATE TABLE IF NOT EXISTS public.project_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days') NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_invites_email ON public.project_invites(email);
CREATE INDEX IF NOT EXISTS idx_project_invites_project ON public.project_invites(project_id);

ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view invites for their projects"
  ON public.project_invites FOR SELECT
  TO authenticated
  USING (public.is_project_owner(project_id) OR email = auth.jwt()->>'email');

CREATE POLICY "Owners can create invites"
  ON public.project_invites FOR INSERT
  TO authenticated
  WITH CHECK (public.is_project_owner(project_id));

CREATE POLICY "Owners can delete invites"
  ON public.project_invites FOR DELETE
  TO authenticated
  USING (public.is_project_owner(project_id));
