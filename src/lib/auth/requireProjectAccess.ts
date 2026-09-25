import 'server-only';
import { requireUser } from './requireUser';
import { LOCAL_USER_ID } from './getCurrentUser';
import { toUuid } from '@/lib/utils/toUuid';
import { hasMinimumRole, ProjectRole } from './permissions';
import { db, isDatabaseConfigured } from '@/db';
import { projects, projectMembers, profiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { User } from '@supabase/supabase-js';

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export interface ProjectAccessResult {
  user: User;
  role: ProjectRole;
  project: typeof projects.$inferSelect;
}

export async function requireProjectAccess(
  projectId: string,
  requiredRole: ProjectRole = 'viewer'
): Promise<ProjectAccessResult> {
  const user = await requireUser();

  if (!isDatabaseConfigured()) {
    // If DB is not configured, grant owner access to the authenticated user for local fallback
    return {
      user,
      role: 'owner',
      project: {
        id: projectId,
        ownerId: user.id,
        name: 'Local Project',
        width: 1920,
        height: 1080,
        resolution: 72,
        backgroundColor: '#ffffff',
        colorMode: 'RGB',
        document: {},
        thumbnailUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

  const normalizedProjectId = toUuid(projectId);

  // 1. Fetch project from Drizzle
  let project = await db.query.projects.findFirst({
    where: eq(projects.id, normalizedProjectId),
  });

  if (!project) {
    try {
      const displayName =
        user.user_metadata?.display_name ||
        user.user_metadata?.full_name ||
        (user.email ? user.email.split('@')[0] : 'Creator');
      const normalizedEmail = user.email ? user.email.trim().toLowerCase() : null;

      // Ensure user profile exists before foreign key insert
      await db
        .insert(profiles)
        .values({
          id: user.id,
          displayName,
          email: normalizedEmail,
          avatarUrl: user.user_metadata?.avatar_url || null,
        })
        .onConflictDoNothing();

      const [newProj] = await db
        .insert(projects)
        .values({
          id: normalizedProjectId,
          ownerId: user.id,
          name: 'Untitled Project',
          width: 1920,
          height: 1080,
          resolution: 72,
          backgroundColor: '#ffffff',
          colorMode: 'RGB',
          document: { version: 1, layers: [] },
        })
        .onConflictDoNothing()
        .returning();

      await db
        .insert(projectMembers)
        .values({
          projectId: normalizedProjectId,
          userId: user.id,
          role: 'owner',
        })
        .onConflictDoNothing();

      project = newProj || (await db.query.projects.findFirst({ where: eq(projects.id, normalizedProjectId) }));
    } catch (e) {
      console.warn('Auto-create project in DB failed:', e);
    }
  }

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // 2. Check if owner
  if (project.ownerId === user.id) {
    return { user, role: 'owner', project };
  }

  // 3. Check if member
  const member = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, normalizedProjectId),
      eq(projectMembers.userId, user.id)
    ),
  });

  if (!member) {
    throw new ForbiddenError('You do not have access to this project');
  }

  const role = member.role as ProjectRole;

  if (!hasMinimumRole(role, requiredRole)) {
    throw new ForbiddenError(`Insufficient permissions. Required role: ${requiredRole}`);
  }

  return { user, role, project };
}
