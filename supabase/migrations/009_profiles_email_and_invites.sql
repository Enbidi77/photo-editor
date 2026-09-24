-- 009_profiles_email_and_invites.sql: Add email to profiles and update invite policies

-- 1. Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 2. Update trigger to save email on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
    new.email
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update DELETE policy on project_invites so invited user can decline their own invite
DROP POLICY IF EXISTS "Owners can delete invites" ON public.project_invites;
DROP POLICY IF EXISTS "Owners or invited users can delete invites" ON public.project_invites;
CREATE POLICY "Owners or invited users can delete invites"
  ON public.project_invites FOR DELETE
  TO authenticated
  USING (public.is_project_owner(project_id) OR email = auth.jwt()->>'email');
