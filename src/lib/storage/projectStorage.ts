import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { nanoid } from 'nanoid';

export class ProjectStorage {
  /**
   * Upload an asset file (image, texture, etc.) to the project-assets bucket
   * Returns the public URL of the uploaded asset, or falls back to data URL
   */
  async uploadAsset(
    projectId: string,
    file: File | Blob,
    filename = 'asset.png'
  ): Promise<string> {
    if (!isSupabaseConfigured()) {
      return this.blobToDataUrl(file);
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const ext = filename.split('.').pop() || 'png';
      const storagePath = `${projectId}/${Date.now()}-${nanoid(6)}.${ext}`;

      const { data, error } = await supabase.storage
        .from('project-assets')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error || !data) {
        console.warn('Storage upload error, falling back to data URL:', error?.message);
        return this.blobToDataUrl(file);
      }

      const { data: publicData } = supabase.storage
        .from('project-assets')
        .getPublicUrl(storagePath);

      // Record in project_assets metadata via API route
      try {
        await fetch(`/api/projects/${projectId}/assets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storagePath,
            filename,
            mimeType: file.type || 'image/png',
            sizeBytes: file.size,
          }),
        });
      } catch (assetErr) {
        console.warn('Could not record asset metadata in database:', assetErr);
      }

      return publicData.publicUrl;
    } catch (err) {
      console.warn('Supabase asset upload failed, falling back to data URL:', err);
      return this.blobToDataUrl(file);
    }
  }

  /**
   * Upload a generated thumbnail to the project-thumbnails bucket
   */
  async uploadThumbnail(projectId: string, blob: Blob): Promise<string | null> {
    if (!isSupabaseConfigured()) {
      return this.blobToDataUrl(blob);
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const storagePath = `${projectId}/thumb.png`;

      const { error } = await supabase.storage
        .from('project-thumbnails')
        .upload(storagePath, blob, {
          cacheControl: '60',
          upsert: true,
        });

      if (error) {
        console.warn('Thumbnail upload error:', error.message);
        return null;
      }

      const { data: publicData } = supabase.storage
        .from('project-thumbnails')
        .getPublicUrl(storagePath);

      return publicData.publicUrl;
    } catch (err) {
      console.warn('Supabase thumbnail upload failed:', err);
      return null;
    }
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export const projectStorage = new ProjectStorage();
