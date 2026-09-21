-- 008_storage_buckets.sql: Supabase Storage configuration and access policies

-- Create storage buckets if they do not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-assets', 'project-assets', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-thumbnails', 'project-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for project-assets
CREATE POLICY "Public read for project assets"
  ON storage.objects FOR SELECT
  TO authenticated, anon
  USING (bucket_id IN ('project-assets', 'project-thumbnails'));

CREATE POLICY "Authenticated users can upload project assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id IN ('project-assets', 'project-thumbnails'));

CREATE POLICY "Authenticated users can update their uploaded assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id IN ('project-assets', 'project-thumbnails'));

CREATE POLICY "Authenticated users can delete their uploaded assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id IN ('project-assets', 'project-thumbnails'));
