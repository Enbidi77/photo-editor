import 'server-only';
import { requireUser } from './requireUser';
import { hasMinimumRole, ProjectRole } from './permissions';
import { db, isDatabaseConfigured } from '@/db';
import { projects, projectMembers } from '@/db/schema';
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

  // 1. Fetch project from Drizzle
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

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
      eq(projectMembers.projectId, projectId),
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
