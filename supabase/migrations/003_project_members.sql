-- 003_project_members.sql: Project membership and role-based policies

CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(project_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);

-- Enable RLS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Security helper functions
CREATE OR REPLACE FUNCTION public.is_project_member(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_id AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_project_editor_or_owner(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_id AND user_id = auth.uid() AND role IN ('owner', 'editor')
  ) OR EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_id AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_project_owner(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_id AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for public.projects
CREATE POLICY "Users can view projects they own or are members of"
  ON public.projects FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_project_member(id));

CREATE POLICY "Authenticated users can create projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners and editors can update projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (public.is_project_editor_or_owner(id))
  WITH CHECK (public.is_project_editor_or_owner(id));

CREATE POLICY "Only owners can delete projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Policies for public.project_members
CREATE POLICY "Users can view members of their projects"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (public.is_project_member(project_id));

CREATE POLICY "Owners can add members"
  ON public.project_members FOR INSERT
  TO authenticated
  WITH CHECK (public.is_project_owner(project_id));

CREATE POLICY "Owners can update member roles"
  ON public.project_members FOR UPDATE
  TO authenticated
  USING (public.is_project_owner(project_id))
  WITH CHECK (public.is_project_owner(project_id));

CREATE POLICY "Owners can remove members or users can leave"
  ON public.project_members FOR DELETE
  TO authenticated
  USING (public.is_project_owner(project_id) OR user_id = auth.uid());

-- Trigger to automatically add owner to project_members on project creation
CREATE OR REPLACE FUNCTION public.handle_new_project_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (new.id, new.owner_id, 'owner')
  ON CONFLICT (project_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_project_created ON public.projects;
CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_project_owner();
