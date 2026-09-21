-- 002_projects.sql: Projects schema and base RLS

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  width INTEGER NOT NULL DEFAULT 1920,
  height INTEGER NOT NULL DEFAULT 1080,
  resolution INTEGER NOT NULL DEFAULT 72,
  background_color TEXT DEFAULT '#ffffff',
  color_mode TEXT DEFAULT 'RGB',
  document JSONB NOT NULL DEFAULT '{"version": 1, "layers": []}'::jsonb,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON public.projects(updated_at DESC);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Note: Combined access policies (checking owner OR project_members) will be defined after project_members table exists
