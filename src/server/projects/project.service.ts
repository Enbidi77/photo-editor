import 'server-only';
import { db, isDatabaseConfigured } from '@/db';
import { projects, projectMembers, ProjectRow } from '@/db/schema';
import { projectRepository } from './project.repository';
import { CreateProjectDto, UpdateProjectDto } from '@/lib/validation/project';
import { ProjectRole } from '@/lib/auth/permissions';
import { eq } from 'drizzle-orm';

export interface ProjectWithRole {
  project: ProjectRow;
  role: ProjectRole;
}

export class ProjectService {
  async createProject(userId: string, input: CreateProjectDto): Promise<ProjectRow> {
    if (!isDatabaseConfigured()) {
      throw new Error('Database not configured');
    }

    // Transactional creation: project row + owner membership record
    return await db.transaction(async (tx) => {
      const initialDoc = {
        version: 1,
        name: input.name,
        width: input.width,
        height: input.height,
        resolution: input.resolution,
        backgroundColor: input.backgroundColor,
        colorMode: input.colorMode,
        layers: [],
      };

      const [newProject] = await tx
        .insert(projects)
        .values({
          ownerId: userId,
          name: input.name,
          width: input.width,
          height: input.height,
          resolution: input.resolution,
          backgroundColor: input.backgroundColor,
          colorMode: input.colorMode,
          document: initialDoc,
        })
        .returning();

      await tx.insert(projectMembers).values({
        projectId: newProject.id,
        userId,
        role: 'owner',
      });

      return newProject;
    });
  }

  async getProject(projectId: string, userId: string): Promise<ProjectWithRole | null> {
    const project = await projectRepository.getById(projectId);
    if (!project) return null;

    let role: ProjectRole = 'viewer';

    if (project.ownerId === userId) {
      role = 'owner';
    } else if (isDatabaseConfigured()) {
      const member = await db.query.projectMembers.findFirst({
        where: (pm, { and, eq: eqFn }) =>
          and(eqFn(pm.projectId, projectId), eqFn(pm.userId, userId)),
      });
      if (member) {
        role = member.role as ProjectRole;
      }
    }

    return { project, role };
  }

  async listUserProjects(userId: string) {
    return await projectRepository.listForUser(userId);
  }

  async updateProject(projectId: string, input: UpdateProjectDto): Promise<ProjectRow> {
    return await projectRepository.update(projectId, input);
  }

  async deleteProject(projectId: string): Promise<void> {
    if (!isDatabaseConfigured()) {
      throw new Error('Database not configured');
    }

    await db.transaction(async (tx) => {
      await tx.delete(projects).where(eq(projects.id, projectId));
    });
  }
}

export const projectService = new ProjectService();
