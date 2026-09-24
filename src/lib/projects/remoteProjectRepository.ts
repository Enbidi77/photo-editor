import { isSupabaseConfigured } from '@/lib/supabase/client';
import { PixelForgeProject, RecentProjectSummary } from '@/types/project';
import { ProjectMember, UserRole } from '@/types/auth';
import { LocalProjectRepository } from '@/lib/storage/projectRepository';

export interface CreateProjectInput {
  name: string;
  width: number;
  height: number;
  resolution?: number;
  backgroundColor?: string;
  colorMode?: 'RGB';
}

export interface CloudProjectRecord {
  project: PixelForgeProject;
  role: UserRole;
  ownerId: string;
}

export class RemoteProjectRepository {
  private localFallback = new LocalProjectRepository();

  async get(id: string): Promise<CloudProjectRecord | null> {
    if (!isSupabaseConfigured()) {
      const local = await this.localFallback.get(id);
      if (!local) return null;
      return {
        project: local,
        role: 'owner',
        ownerId: 'local-user-1',
      };
    }

    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) {
        // Fallback to local DB if not found or unauthorized
        const local = await this.localFallback.get(id);
        if (local) {
          return { project: local, role: 'owner', ownerId: 'local-user-1' };
        }
        return null;
      }

      const data = await res.json();
      const p = data.project;
      const doc = p.document || {};

      const project: PixelForgeProject = {
        version: 1,
        id: p.id,
        document: {
          id: p.id,
          name: p.name,
          width: p.width,
          height: p.height,
          resolution: p.resolution || 72,
          backgroundColor: p.backgroundColor || p.background_color || '#ffffff',
          colorMode: p.colorMode || p.color_mode || 'RGB',
          createdAt: new Date(p.createdAt || p.created_at).getTime(),
          updatedAt: new Date(p.updatedAt || p.updated_at).getTime(),
        },
        layers: doc.layers || [],
        thumbnail: p.thumbnailUrl || p.thumbnail_url || undefined,
        createdAt: new Date(p.createdAt || p.created_at).getTime(),
        updatedAt: new Date(p.updatedAt || p.updated_at).getTime(),
      };

      return {
        project,
        role: data.role as UserRole,
        ownerId: p.ownerId || p.owner_id,
      };
    } catch (err) {
      console.warn('API error fetching project, falling back to local:', err);
      const local = await this.localFallback.get(id);
      if (local) {
        return { project: local, role: 'owner', ownerId: 'local-user-1' };
      }
      return null;
    }
  }

  async create(input: CreateProjectInput): Promise<PixelForgeProject> {
    if (!isSupabaseConfigured()) {
      const id = `local-proj-${Date.now()}`;
      const project: PixelForgeProject = {
        version: 1,
        id,
        document: {
          id,
          name: input.name,
          width: input.width,
          height: input.height,
          resolution: input.resolution || 72,
          backgroundColor: input.backgroundColor || '#ffffff',
          colorMode: input.colorMode || 'RGB',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        layers: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await this.localFallback.save(project);
      return project;
    }

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create project');
      }

      const { project: p } = await res.json();

      return {
        version: 1,
        id: p.id,
        document: {
          id: p.id,
          name: p.name,
          width: p.width,
          height: p.height,
          resolution: p.resolution,
          backgroundColor: p.backgroundColor || p.background_color,
          colorMode: p.colorMode || p.color_mode,
          createdAt: new Date(p.createdAt || p.created_at).getTime(),
          updatedAt: new Date(p.updatedAt || p.updated_at).getTime(),
        },
        layers: [],
        createdAt: new Date(p.createdAt || p.created_at).getTime(),
        updatedAt: new Date(p.updatedAt || p.updated_at).getTime(),
      };
    } catch (err: any) {
      console.warn('API project creation failed, creating local project:', err);
      const id = `local-proj-${Date.now()}`;
      const project: PixelForgeProject = {
        version: 1,
        id,
        document: {
          id,
          name: input.name,
          width: input.width,
          height: input.height,
          resolution: input.resolution || 72,
          backgroundColor: input.backgroundColor || '#ffffff',
          colorMode: input.colorMode || 'RGB',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        layers: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await this.localFallback.save(project);
      return project;
    }
  }

  async saveRemote(project: PixelForgeProject, options?: { keepalive?: boolean }): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const docJson = {
      version: project.version,
      layers: project.layers,
    };

    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: project.document.name,
        width: project.document.width,
        height: project.document.height,
        resolution: project.document.resolution,
        backgroundColor: project.document.backgroundColor,
        document: docJson,
        thumbnailUrl: project.thumbnail || null,
      }),
      keepalive: options?.keepalive,
    });

    if (!res.ok) {
      let errorMsg = `Server responded with status ${res.status}`;
      try {
        const errorData = await res.json();
        if (errorData?.error) errorMsg = errorData.error;
      } catch {
        // use status text
      }
      throw new Error(errorMsg);
    }
  }

  async save(project: PixelForgeProject): Promise<void> {
    // Always keep local cache up to date
    await this.localFallback.save(project);

    if (!isSupabaseConfigured()) return;

    try {
      await this.saveRemote(project);
    } catch (err) {
      console.warn('API project save failed:', err);
    }
  }

  async getAll(): Promise<RecentProjectSummary[]> {
    if (!isSupabaseConfigured()) {
      return this.localFallback.getRecent();
    }

    try {
      const res = await fetch('/api/projects');
      if (!res.ok) {
        return this.localFallback.getRecent();
      }

      const { projects } = await res.json();
      if (!Array.isArray(projects)) {
        return this.localFallback.getRecent();
      }

      return projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        width: p.width,
        height: p.height,
        updatedAt: new Date(p.updatedAt || p.updated_at).getTime(),
        thumbnail: p.thumbnailUrl || p.thumbnail_url || undefined,
        layerCount: Array.isArray(p.document?.layers) ? p.document.layers.length : 0,
      }));
    } catch (err) {
      console.warn('API getAll failed, using local recent:', err);
      return this.localFallback.getRecent();
    }
  }

  async delete(id: string): Promise<void> {
    await this.localFallback.delete(id);
    if (!isSupabaseConfigured()) return;

    try {
      await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('API delete failed:', err);
    }
  }

  async getMembers(projectId: string): Promise<ProjectMember[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const res = await fetch(`/api/projects/${projectId}/members`);
      if (!res.ok) return [];

      const { members } = await res.json();
      if (!Array.isArray(members)) return [];

      return members.map((m: any) => ({
        id: m.id,
        projectId: m.projectId || m.project_id,
        userId: m.userId || m.user_id,
        role: m.role as UserRole,
        createdAt: m.createdAt || m.created_at,
        profile: m.profile
          ? {
              id: m.profile.id,
              displayName: m.profile.displayName || m.profile.display_name || 'Collaborator',
              avatarUrl: m.profile.avatarUrl || m.profile.avatar_url,
            }
          : undefined,
      }));
    } catch (err) {
      console.warn('API getMembers failed:', err);
      return [];
    }
  }

  async inviteMember(
    projectId: string,
    email: string,
    role: 'editor' | 'viewer'
  ): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured()) {
      return { error: null };
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || 'Failed to invite member' };
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Network error' };
    }
  }
}

export const remoteProjectRepository = new RemoteProjectRepository();
