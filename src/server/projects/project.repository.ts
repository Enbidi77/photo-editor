import 'server-only';
import { db, isDatabaseConfigured } from '@/db';
import { projects, projectMembers, ProjectRow, NewProjectRow } from '@/db/schema';
import { eq, inArray, desc } from 'drizzle-orm';

export interface ProjectRepository {
  create(input: NewProjectRow): Promise<ProjectRow>;
  getById(projectId: string): Promise<ProjectRow | null>;
  listForUser(userId: string): Promise<ProjectRow[]>;
  update(projectId: string, changes: Partial<NewProjectRow>): Promise<ProjectRow>;
  delete(projectId: string): Promise<void>;
}

export class DrizzleProjectRepository implements ProjectRepository {
  async create(input: NewProjectRow): Promise<ProjectRow> {
    if (!isDatabaseConfigured()) {
      throw new Error('Database not configured');
    }

    const [created] = await db.insert(projects).values(input).returning();
    return created;
  }

  async getById(projectId: string): Promise<ProjectRow | null> {
    if (!isDatabaseConfigured()) {
      return null;
    }

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    return project || null;
  }

  async listForUser(userId: string): Promise<ProjectRow[]> {
    if (!isDatabaseConfigured()) {
      return [];
    }

    // 1. Projects where user is owner
    const ownedProjects = await db.query.projects.findMany({
      where: eq(projects.ownerId, userId),
      orderBy: [desc(projects.updatedAt)],
    });

    // 2. Projects where user is a member
    const memberships = await db.query.projectMembers.findMany({
      where: eq(projectMembers.userId, userId),
    });

    const memberProjectIds = memberships
      .map((m) => m.projectId)
      .filter((id) => !ownedProjects.some((op) => op.id === id));

    let memberProjects: ProjectRow[] = [];
    if (memberProjectIds.length > 0) {
      memberProjects = await db.query.projects.findMany({
        where: inArray(projects.id, memberProjectIds),
        orderBy: [desc(projects.updatedAt)],
      });
    }

    return [...ownedProjects, ...memberProjects].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  async update(projectId: string, changes: Partial<NewProjectRow>): Promise<ProjectRow> {
    if (!isDatabaseConfigured()) {
      throw new Error('Database not configured');
    }

    const [updated] = await db
      .update(projects)
      .set({
        ...changes,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();

    return updated;
  }

  async delete(projectId: string): Promise<void> {
    if (!isDatabaseConfigured()) {
      throw new Error('Database not configured');
    }

    await db.delete(projects).where(eq(projects.id, projectId));
  }
}

export const projectRepository = new DrizzleProjectRepository();
